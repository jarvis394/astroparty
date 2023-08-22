import {
  GameRoomState,
  SchemaPlayer,
} from '@astroparty/shared/colyseus/GameSchema'
import {
  SnapshotBuffer,
  Snapshot,
  SnapshotPlayer,
  SnapshotBullet,
} from '@astroparty/shared/colyseus/Snapshot'
import { EventEmitter, Engine, Player } from '@astroparty/engine'
import Matter from 'matter-js'
import { WS_HOSTNAME } from 'src/config/constants'
import * as Colyseus from 'colyseus.js'

export enum ClientEngineEvents {
  INIT_ROOM = 'init_room',
  PLAYER_JOIN = 'player_join',
  PLAYER_LEFT = 'player_left',
}

type ClientEngineEmitterEvents = {
  [ClientEngineEvents.INIT_ROOM]: (state: GameRoomState) => void
  [ClientEngineEvents.PLAYER_JOIN]: (player: SchemaPlayer) => void
  [ClientEngineEvents.PLAYER_LEFT]: (playerId: Player['id']) => void
}

export class ClientEngine extends EventEmitter<ClientEngineEmitterEvents> {
  snapshotBuffer: SnapshotBuffer
  client: Colyseus.Client
  engine: Engine
  room?: Colyseus.Room<GameRoomState>
  playerId: string | null
  keysPressed: Set<string> = new Set()
  private isHoldingShootButton = false

  constructor(engine: Engine, playerId: string | null) {
    super()
    this.snapshotBuffer = new SnapshotBuffer()
    this.engine = engine
    this.client = new Colyseus.Client(WS_HOSTNAME)
    this.playerId = playerId
  }

  init() {
    Matter.Events.on(this.engine.matterEngine, 'beforeUpdate', () => {
      this.keysPressed.forEach((keyCode) => {
        this.handleKeyDown(keyCode)
      })
    })

    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
  }

  async startGame() {
    if (!this.playerId) return

    this.room = await this.client.joinOrCreate<GameRoomState>('game', {
      playerId: this.playerId,
    })

    this.registerSocketHandlers(this.room)

    // TODO: fixme proper reenact
    setInterval(() => {
      this.frameSync(true)
      console.log('update')
    }, 6000)
  }

  // TODO fixme remove overrideLocal
  frameSync(overrideLocal = false) {
    if (this.snapshotBuffer.length > 30) {
      this.snapshotBuffer.reset()
    }

    const currentSnapshot = this.snapshotBuffer.shift()
    if (!currentSnapshot) return

    this.syncStateBySnapshot(currentSnapshot, overrideLocal)
  }

  // TODO fixme remove overrideLocal
  syncStateBySnapshot(snapshot: Snapshot, overrideLocal = false) {
    this.engine.game.world.players.forEach((player) => {
      const snapshotPlayer = snapshot.players.get(player.id)

      if (!snapshotPlayer) {
        return this.engine.game.world.removePlayer(player.id)
      }

      // TODO fixme remove overrideLocal
      if (!overrideLocal && !player.isServerControlled) return

      Matter.Body.setPosition(player.body, snapshotPlayer.position)
      Matter.Body.setVelocity(player.body, { x: 0, y: 0 })
      player.angle = snapshotPlayer.angle
      player.aliveState = snapshotPlayer.aliveState
      player.bullets = snapshotPlayer.bullets
    })

    this.engine.game.world.bullets.forEach((bullet) => {
      const snapshotBullet = snapshot.bullets.get(bullet.id)

      if (!snapshotBullet) {
        return this.engine.game.world.removeBullet(bullet.id)
      }

      if (!bullet.isServerControlled) return

      Matter.Body.setPosition(bullet.body, snapshotBullet.position)
      Matter.Body.setVelocity(bullet.body, { x: 0, y: 0 })
    })

    snapshot.bullets.forEach((snapshotBullet) => {
      if (this.engine.game.world.getBulletByID(snapshotBullet.id)) return

      const player = this.engine.game.world.getPlayerByID(
        snapshotBullet.playerId
      )

      if (!player) {
        console.error(
          `No player with ID "${snapshotBullet.playerId}" was found when trying to add bullet`
        )
        return
      }

      const bullet = this.engine.game.world.createBullet(
        player,
        snapshotBullet.id
      )
      bullet.setServerControlled(true)
      this.engine.game.world.addBullet(bullet)
    })

    this.engine.frame = snapshot.frame
  }

  generateSnapshot(state: GameRoomState): Snapshot {
    const players = new Map()
    const bullets = new Map()

    state.players.forEach((player, id) => {
      players.set(
        id,
        new SnapshotPlayer({
          id,
          position: {
            x: player.position.x,
            y: player.position.y,
          },
          bullets: player.bullets,
          aliveState: player.aliveState,
          angle: player.angle,
        })
      )
    })

    state.bullets.forEach((bullet, id) => {
      bullets.set(
        id,
        new SnapshotBullet({
          id,
          position: {
            x: bullet.position.x,
            y: bullet.position.y,
          },
          playerId: bullet.playerId,
        })
      )
    })

    return new Snapshot({
      frame: state.frame,
      bullets,
      players,
      next: null,
      timestamp: state.timestamp,
    })
  }

  handleInitRoom(state: GameRoomState) {
    this.engine.frame = 0

    Object.values(state.players).forEach((serverPlayer) => {
      const player = new Player(
        serverPlayer.id,
        serverPlayer.position,
        this.engine.game.world
      )
      player.angle = serverPlayer.angle
      player.aliveState = serverPlayer.aliveState
      player.bullets = serverPlayer.bullets
      player.setServerControlled(this.playerId !== serverPlayer.id)
      this.engine.addPlayer(player)

      if (this.playerId === serverPlayer.id) {
        this.engine.game.setMe(player)
      }
    })

    Object.values(state.bullets).forEach((serverBullet) => {
      const player = this.engine.game.world.getPlayerByID(serverBullet.playerId)

      if (!player) {
        console.error(
          `No player with ID "${serverBullet.playerId}" was found when trying to add bullet`
        )
        return
      }

      const bullet = this.engine.game.world.createBullet(
        player,
        serverBullet.id
      )
      bullet.setServerControlled(true)
      this.engine.game.world.addBullet(bullet)
    })

    this.eventEmitter.emit(ClientEngineEvents.INIT_ROOM, state)
  }

  handlePlayerJoin(serverPlayer: SchemaPlayer) {
    if (!this.playerId) return

    console.log('player_join', serverPlayer)

    const player = new Player(
      serverPlayer.id,
      serverPlayer.position,
      this.engine.game.world
    )
    player.angle = serverPlayer.angle
    player.aliveState = serverPlayer.aliveState
    player.bullets = serverPlayer.bullets
    player.setServerControlled(true)
    this.engine.game.world.players.set(player.id, player)

    this.eventEmitter.emit(ClientEngineEvents.PLAYER_JOIN, serverPlayer)
  }

  handlePlayerLeft(playerId: string) {
    this.engine.removePlayer(playerId)
    this.eventEmitter.emit(ClientEngineEvents.PLAYER_LEFT, playerId)
  }

  registerSocketHandlers(room: Colyseus.Room<GameRoomState>) {
    room.onStateChange((state) => {
      this.snapshotBuffer.push(this.generateSnapshot(state))
    })

    room.onMessage('init_room', this.handleInitRoom.bind(this))
    room.onMessage('player_join', this.handlePlayerJoin.bind(this))
    room.onMessage('player_left', this.handlePlayerLeft.bind(this))
  }

  handleKeyDown(keyCode: string) {
    if (!this.engine.game.me) return

    switch (keyCode) {
      case 'ArrowRight':
        if (this.engine.game.me.isRotating) return
        this.room?.send('rotate', 'start')
        this.engine.game.me.isRotating = true
        break
      case 'KeyW':
        if (this.engine.game.me.isDashing) return
        this.room?.send('dash')
        this.engine.game.me.dash()
        break
      case 'Space':
        if (this.isHoldingShootButton) return
        this.room?.send('shoot')
        this.engine.game.me.shoot()
        this.isHoldingShootButton = true
        break
    }
  }

  onKeyDown(e: KeyboardEvent) {
    this.keysPressed.add(e.code)
  }

  onKeyUp(e: KeyboardEvent) {
    this.keysPressed.delete(e.code)

    if (!this.engine.game.me) return

    switch (e.code) {
      case 'ArrowRight':
        this.room?.send('rotate', 'stop')
        this.engine.game.me.isRotating = false
        break
      case 'Space':
        this.isHoldingShootButton = false
        break
    }
  }
}

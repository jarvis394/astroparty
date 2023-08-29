import {
  GameRoomState,
  SchemaPlayer,
} from '@astroparty/shared/colyseus/GameSchema'
import {
  Snapshot,
  SnapshotBullet,
  SnapshotPlayer,
  restoreBulletsFromSnapshot,
  restorePlayersFromSnapshot,
} from '@astroparty/shared/colyseus/Snapshot'
import { EventEmitter, Engine, Player } from '@astroparty/engine'
import Matter from 'matter-js'
import {
  MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED,
  WS_HOSTNAME,
} from 'src/config/constants'
import * as Colyseus from 'colyseus.js'
import { SnapshotInterpolation, Vault } from '@geckos.io/snapshot-interpolation'

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
  snapshots: SnapshotInterpolation
  clientSnapshotsVault: Vault
  client: Colyseus.Client
  engine: Engine
  room?: Colyseus.Room<GameRoomState>
  playerId: string | null
  keysPressed: Set<string> = new Set()
  private isHoldingShootButton = false

  constructor(engine: Engine, playerId: string | null) {
    super()
    this.snapshots = new SnapshotInterpolation(Engine.MIN_FPS)
    this.clientSnapshotsVault = new Vault()
    this.engine = engine
    this.client = new Colyseus.Client(WS_HOSTNAME)
    this.playerId = playerId
  }

  init() {
    Matter.Events.on(this.engine.matterEngine, 'beforeUpdate', () => {
      this.keysPressed.forEach((keyCode) => {
        this.handleKeyDown(keyCode)
      })

      const snapshot = this.generateSnapshotForClientEngine()
      snapshot && this.clientSnapshotsVault.add(snapshot)
    })

    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
  }

  async startGame() {
    if (!this.playerId) return

    this.room = await this.client.joinOrCreate<GameRoomState>('game', {
      playerId: this.playerId,
    })

    this.room.onStateChange((state) => {
      this.handleRoomStateChange(state)
    })

    this.room.onMessage('init_room', this.handleInitRoom.bind(this))
    this.room.onMessage('player_join', this.handlePlayerJoin.bind(this))
    this.room.onMessage('player_left', this.handlePlayerLeft.bind(this))
  }

  serverReconciliation() {
    const player = this.engine.game.me

    if (player) {
      // Get latest snapshot from the server
      const serverSnapshot = this.snapshots.vault.get() as Snapshot | undefined
      // Get closest player snapshot that matches server's snapshot time
      const playerSnapshot = this.clientSnapshotsVault.get(
        serverSnapshot?.time || Date.now(),
        true
      ) as Snapshot | undefined

      if (serverSnapshot && playerSnapshot) {
        const serverPos = serverSnapshot.state.players.find(
          (s) => s.id === this.playerId
        )
        const clientPos = playerSnapshot.state.players.find(
          (s) => s.id === this.playerId
        )

        if (!clientPos || !serverPos) return

        // Calculate the offset between server and client
        const offsetX = clientPos?.positionX - serverPos?.positionX
        const offsetY = clientPos?.positionY - serverPos?.positionY
        const offsetAngle = clientPos?.angle - serverPos?.angle
        const correction = 60

        // Apply a step by step correction of the player's position
        Matter.Body.setPosition(
          player.body,
          Matter.Vector.create(
            player.body.position.x - offsetX / correction,
            player.body.position.y - offsetY / correction
          )
        )
        player.angle -= offsetAngle / correction
      }
    }
  }

  frameSync() {
    this.serverReconciliation()

    const playersSnapshot = this.snapshots.calcInterpolation(
      'positionX positionY angle(deg) velocityX velocityY',
      'players'
    )
    const bulletsSnapshot = this.snapshots.calcInterpolation(
      'positionX positionY',
      'bullets'
    )
    const players = playersSnapshot?.state as
      | Snapshot['state']['players']
      | undefined
    const bullets = bulletsSnapshot?.state as
      | Snapshot['state']['bullets']
      | undefined

    players && restorePlayersFromSnapshot(this.engine, players)
    bullets && restoreBulletsFromSnapshot(this.engine, bullets)
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

      if (MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED) {
        player.setServerControlled(true)
      } else {
        player.setServerControlled(this.playerId !== serverPlayer.id)
      }

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

  generateSnapshotForClientEngine(): Snapshot | false {
    const me = this.engine.game.me

    if (!me) return false

    const player: SnapshotPlayer = {
      id: me.id,
      angle: me.angle,
      aliveState: me.aliveState,
      bullets: me.bullets,
      positionX: me.body.position.x,
      positionY: me.body.position.y,
      velocityX: me.body.velocity.x,
      velocityY: me.body.velocity.y,
    }
    const bullets: SnapshotBullet[] = []

    for (const bullet of this.engine.game.world.getAllBulletsIterator()) {
      bullets.push({
        id: bullet.id,
        playerId: bullet.playerId,
        positionX: bullet.body.position.x,
        positionY: bullet.body.position.y,
      })
    }

    return {
      id: this.engine.frame.toString(),
      time: Date.now(),
      state: {
        players: [player],
        bullets,
      },
    }
  }

  handleRoomStateChange(state: GameRoomState) {
    const players: SnapshotPlayer[] = []
    const bullets: SnapshotBullet[] = []

    state.players.forEach((player) =>
      players.push({
        id: player.id,
        angle: player.angle,
        aliveState: player.aliveState,
        bullets: player.bullets,
        positionX: player.position.x,
        positionY: player.position.y,
        velocityX: player.velocity.x,
        velocityY: player.velocity.y,
      })
    )

    state.bullets.forEach((bullet) =>
      bullets.push({
        id: bullet.id,
        playerId: bullet.playerId,
        positionX: bullet.position.x,
        positionY: bullet.position.y,
      })
    )

    this.snapshots.vault.add({
      id: state.frame.toString(),
      time: Date.now(),
      state: {
        players,
        bullets,
      },
    })
  }

  handleKeyDown(keyCode: string) {
    if (!this.engine.game.me) return

    switch (keyCode) {
      // Поворот направо
      case 'ArrowRight': {
        if (this.engine.game.me?.isRotating) return

        this.room?.send('rotate', {
          action: 'start',
          frame: this.engine.frame,
        })

        this.engine.game.me.isRotating = true
        break
      }
      // Прыжок
      case 'KeyW': {
        if (
          !MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED &&
          this.engine.game.me.isDashing
        ) {
          return
        }

        this.room?.send('dash')

        if (!MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED) {
          this.engine.game.me.dash()
        }
        break
      }
      // Выстрел
      case 'Space':
        if (this.isHoldingShootButton) return
        this.room?.send('shoot')
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
      // Поворот направо
      case 'ArrowRight': {
        this.room?.send('rotate', {
          action: 'stop',
          frame: this.engine.frame,
        })

        this.engine.game.me.isRotating = false
        break
      }
      // Выстрел
      case 'Space': {
        this.isHoldingShootButton = false
        break
      }
    }
  }
}

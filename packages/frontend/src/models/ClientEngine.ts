import {
  GameRoomState,
  SchemaPlayer,
} from '@astroparty/shared/colyseus/GameSchema'
import { SnapshotHistory, Snapshot } from '@astroparty/shared/colyseus/Snapshot'
import { EventEmitter, Engine, Player } from '@astroparty/engine'
import Matter from 'matter-js'
import {
  MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED,
  WS_HOSTNAME,
} from 'src/config/constants'
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
  snapshotHistory: SnapshotHistory
  client: Colyseus.Client
  engine: Engine
  room?: Colyseus.Room<GameRoomState>
  playerId: string | null
  keysPressed: Set<string> = new Set()
  private isHoldingShootButton = false

  constructor(engine: Engine, playerId: string | null) {
    super()
    this.snapshotHistory = new SnapshotHistory()
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
    // setInterval(() => {
    //   this.frameSync(true)
    //   console.log('update')
    // }, 6000)
  }

  // TODO fixme remove overrideLocal
  frameSync(overrideLocal = false) {
    if (this.snapshotHistory.length > 30) {
      this.snapshotHistory.reset()
    }

    let currentSnapshot = this.snapshotHistory.shift()
    while (currentSnapshot && currentSnapshot.frame < this.engine.frame) {
      currentSnapshot = this.snapshotHistory.shift()
    }
    if (!currentSnapshot) return

    Snapshot.syncEngineBySnapshot(this.engine, currentSnapshot, overrideLocal)
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

  registerSocketHandlers(room: Colyseus.Room<GameRoomState>) {
    room.onMessage('init_room', this.handleInitRoom.bind(this))
    room.onMessage('snapshot', this.handleSnapshotRecieve.bind(this))
    room.onMessage('player_join', this.handlePlayerJoin.bind(this))
    room.onMessage('player_left', this.handlePlayerLeft.bind(this))
  }

  handleSnapshotRecieve(state: Snapshot) {
    this.snapshotHistory.push(state.frame, state)
  }

  handleKeyDown(keyCode: string) {
    if (!this.engine.game.me) return

    switch (keyCode) {
      // Поворот направо
      case 'ArrowRight': {
        if (this.engine.game.me?.isRotating) return

        console.log('rotate start at frame:', this.engine.frame)

        this.room?.send('rotate', {
          frame: this.engine.frame,
        })

        // if (!MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED) {
        this.engine.game.me.rotate()
        // }

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

        if (!MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED) {
          this.engine.game.me.shoot()
        }

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
      // case 'ArrowRight': {
      //   console.log('rotate stop at frame:', this.engine.frame)

      //   this.room?.send('rotate', {
      //     action: 'stop',
      //     frame: this.engine.frame,
      //   })

      //   this.engine.game.me.isRotating = false
      //   break
      // }
      // Выстрел
      case 'Space': {
        this.isHoldingShootButton = false
        break
      }
    }
  }
}

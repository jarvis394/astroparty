import {
  Snapshot,
  SnapshotBullet,
  SnapshotPlayer,
  restoreBulletsFromSnapshot,
  restorePlayersFromSnapshot,
} from '@astroparty/shared/game/Snapshot'
import {
  GameEvents,
  InitEventMessage,
  PlayerJoinEventMessage,
  PlayerLeftEventMessage,
  ShootAckEventMessage,
} from '@astroparty/shared/types/GameEvents'
import map from '@astroparty/shared/utils/map'
import { EventEmitter, Engine, Player } from '@astroparty/engine'
import Matter from 'matter-js'
import { MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED } from 'src/config/constants'
import geckos, { ClientChannel } from '@geckos.io/client'
import { SnapshotInterpolation, Vault } from '@geckos.io/snapshot-interpolation'

export enum ClientEngineEvents {
  INIT_ROOM = 'init_room',
  PLAYER_JOIN = 'player_join',
  PLAYER_LEFT = 'player_left',
}

type ClientEngineEmitterEvents = {
  [ClientEngineEvents.INIT_ROOM]: (state: Snapshot) => void
  [ClientEngineEvents.PLAYER_JOIN]: (player: SnapshotPlayer) => void
  [ClientEngineEvents.PLAYER_LEFT]: (playerId: Player['id']) => void
}

export class ClientEngine extends EventEmitter<ClientEngineEmitterEvents> {
  snapshots: SnapshotInterpolation
  clientSnapshotsVault: Vault
  engine: Engine
  channel: ClientChannel
  playerId: string | null
  keysPressed: Set<string> = new Set()
  private isHoldingShootButton = false

  constructor(engine: Engine, playerId: string | null) {
    super()
    this.snapshots = new SnapshotInterpolation(Engine.MIN_FPS)
    this.clientSnapshotsVault = new Vault()
    this.engine = engine
    this.channel = geckos()
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

    this.channel.onConnect(() => {
      console.log('connected', this.channel)

      this.channel.on(GameEvents.INIT, (message) => {
        this.handleInitRoom(message as InitEventMessage)
      })
      this.channel.on(GameEvents.UPDATE, (message) => {
        this.handleRoomStateChange(message as Snapshot)
      })
      this.channel.on(GameEvents.SHOOT_ACK, (message) => {
        this.handleShootAck(message as ShootAckEventMessage)
      })
      this.channel.on(GameEvents.PLAYER_JOIN, (message) => {
        this.handlePlayerJoin(message as PlayerJoinEventMessage)
      })
      this.channel.on(GameEvents.PLAYER_LEFT, (message) => {
        this.handlePlayerLeft(message as PlayerLeftEventMessage)
      })
    })
  }

  handleShootAck(message: ShootAckEventMessage) {
    const engineBullet = this.engine.game.world.getBulletByID(
      message.localBulletId
    )
    const enginePlayer = this.engine.game.world.getPlayerByID(message.playerId)

    if (!engineBullet || !enginePlayer) return

    engineBullet.setId(message.serverBulletId)
    enginePlayer.bullets = message.playerBulletsAmount
  }

  reconcilePlayer(serverSnapshot: Snapshot, playerSnapshot: Snapshot) {
    const player = this.engine.game.me

    if (!player || player.isDashing) return

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
    const positionCorrectionCoeff =
      200 - map(Math.max(Math.abs(offsetX), Math.abs(offsetY)), 0, 20, 20, 100)
    const angleCorrectionCoeff = 10

    // Apply a step by step correction of the player's position
    Matter.Body.setPosition(
      player.body,
      Matter.Vector.create(
        player.body.position.x - offsetX / positionCorrectionCoeff,
        player.body.position.y - offsetY / positionCorrectionCoeff
      )
    )
    player.angle -= offsetAngle / angleCorrectionCoeff
  }

  reconcileBullets(serverSnapshot: Snapshot, playerSnapshot: Snapshot) {
    serverSnapshot.state.bullets.forEach((serverBullet) => {
      const engineBullet = this.engine.game.world.getBulletByID(serverBullet.id)
      const localBullet = playerSnapshot.state.bullets.find(
        (bullet) => bullet.id === serverBullet.id
      )

      if (!engineBullet || !localBullet) return

      const offsetX = localBullet.positionX - serverBullet.positionX
      const offsetY = localBullet.positionY - serverBullet.positionY
      const correctionCoeff = 20

      Matter.Body.setPosition(
        engineBullet.body,
        Matter.Vector.create(
          engineBullet.body.position.x - offsetX / correctionCoeff,
          engineBullet.body.position.y - offsetY / correctionCoeff
        )
      )
      Matter.Body.setAngle(engineBullet.body, serverBullet.angle)
    })
  }

  serverReconciliation() {
    // Get latest snapshot from the server
    const serverSnapshot = this.snapshots.vault.get() as Snapshot | undefined
    // Get closest player snapshot that matches server's snapshot time
    const playerSnapshot = this.clientSnapshotsVault.get(
      serverSnapshot?.time || Date.now(),
      true
    ) as Snapshot | undefined

    if (serverSnapshot && playerSnapshot) {
      this.reconcilePlayer(serverSnapshot, playerSnapshot)
      this.reconcileBullets(serverSnapshot, playerSnapshot)
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

  handleInitRoom({ snapshot, playerId }: InitEventMessage) {
    this.engine.frame = 0

    Object.values(snapshot.state.players).forEach((serverPlayer) => {
      const player = new Player({
        id: serverPlayer.id,
        position: { x: serverPlayer.positionX, y: serverPlayer.positionY },
        shipSprite: serverPlayer.shipSprite,
        world: this.engine.game.world,
      })
      player.angle = serverPlayer.angle
      player.aliveState = serverPlayer.aliveState
      player.bullets = serverPlayer.bullets

      this.engine.addPlayer(player)

      // Server sends current channel's playerId in INIT event,
      // if player matches that ID, then set that player as local player
      if (
        playerId === serverPlayer.id &&
        !MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED
      ) {
        this.playerId = playerId
        this.engine.game.setMe(player)
        player.setServerControlled(false)
      } else {
        player.setServerControlled(true)
      }
    })

    Object.values(snapshot.state.bullets).forEach((serverBullet) => {
      const player = this.engine.game.world.getPlayerByID(serverBullet.playerId)

      if (!player) {
        console.error(
          `No player with ID "${serverBullet.playerId}" was found when trying to add bullet`
        )
        return
      }

      const bullet = this.engine.game.world.createBullet({
        id: serverBullet.id,
        playerId: player.id,
        playerPosition: player.body.position,
        angle: serverBullet.angle,
        world: player.world,
      })
      bullet.setServerControlled(true)
      this.engine.game.world.addBullet(bullet)
    })

    this.eventEmitter.emit(ClientEngineEvents.INIT_ROOM, snapshot)
  }

  handlePlayerJoin(serverPlayer: SnapshotPlayer) {
    if (!this.playerId) return

    console.log('player_join', serverPlayer)

    const player = new Player({
      id: serverPlayer.id,
      position: { x: serverPlayer.positionX, y: serverPlayer.positionY },
      shipSprite: serverPlayer.shipSprite,
      world: this.engine.game.world,
    })
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
      shipSprite: me.shipSprite,
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
        angle: bullet.body.angle,
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

  handleRoomStateChange(snapshot: Snapshot) {
    this.snapshots.vault.add(snapshot)
  }

  handleKeyDown(keyCode: string) {
    if (!this.engine.game.me) return

    switch (keyCode) {
      // Поворот направо
      case 'ArrowRight': {
        if (this.engine.game.me?.isRotating) return

        this.channel.emit(
          GameEvents.ROTATE,
          {
            action: 'start',
            frame: this.engine.frame,
          },
          {
            reliable: true,
          }
        )

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

        this.channel?.emit(GameEvents.DASH, null, {
          reliable: true,
        })

        if (!MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED) {
          this.engine.game.me.dash()
        }
        break
      }
      // Выстрел
      case 'Space': {
        if (this.isHoldingShootButton) return
        const bullet = this.engine.game.me.shoot()
        this.channel?.emit(GameEvents.SHOOT, bullet ? bullet.id : undefined, {
          reliable: true,
        })
        this.isHoldingShootButton = true
        break
      }
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
        this.channel.emit(
          GameEvents.ROTATE,
          {
            action: 'stop',
            frame: this.engine.frame,
          },
          {
            reliable: true,
          }
        )

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

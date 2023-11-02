import {
  Snapshot,
  SnapshotBullet,
  SnapshotPlayer,
  restoreBulletsFromSnapshot,
  restoreEngineFromSnapshot,
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
import { EventEmitter, Engine, Player, World } from '@astroparty/engine'
import Matter from 'matter-js'
import {
  GECKOS_HOSTNAME,
  GECKOS_PORT,
  MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED,
} from 'src/config/constants'
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

enum ClientInputAction {
  ROTATE_START,
  ROTATE_END,
  SHOOT,
  DASH,
}

enum ClientInputActionKeyCodes {
  ROTATE = 'ArrowRight',
  SHOOT = 'Space',
}

interface ClientInput {
  action: ClientInputAction
  time: number
}

export class ClientEngine extends EventEmitter<ClientEngineEmitterEvents> {
  static DOUBLE_CLICK_TIMEFRAME = 300

  snapshots: SnapshotInterpolation
  clientSnapshotsVault: Vault
  engine: Engine
  mePlayerEngine: Engine
  channel: ClientChannel
  playerId: string | null
  keysPressed: Set<string> = new Set()
  clientInputHistory: ClientInput[]
  timeOffset: number
  private rotateDoubleTapTimer: NodeJS.Timeout | null = null
  private rotateDoubleTapWaiting = false
  private isHoldingShootButton = false

  constructor(engine: Engine, playerId: string | null) {
    super()
    this.snapshots = new SnapshotInterpolation(Engine.MIN_FPS)
    this.clientSnapshotsVault = new Vault()
    this.clientInputHistory = []
    this.engine = engine
    this.mePlayerEngine = new Engine()
    this.channel = geckos({
      url: GECKOS_HOSTNAME,
      port: GECKOS_PORT,
    })
    this.playerId = playerId
    this.timeOffset = -1
  }

  init() {
    Matter.Events.on(this.engine.matterEngine, 'beforeUpdate', () => {
      this.keysPressed.forEach((keyCode) => {
        this.handleKeyDown(keyCode)
      })

      this.mePlayerEngine.update(Engine.MIN_DELTA)

      const snapshot = this.generateSnapshotForClientEngine()
      if (snapshot) {
        this.clientSnapshotsVault.add(snapshot)
      }
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
        this.handleSnapshotRecieve(message as Snapshot)
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

  reconcilePlayer() {
    const { serverSnapshot, playerSnapshot } = this.getLatestSnapshots()

    if (serverSnapshot && playerSnapshot) {
      this.reconcilePlayerBySnapshots(serverSnapshot, playerSnapshot)
    }
  }

  reconcilePlayerBySnapshots(
    serverSnapshot: Snapshot,
    playerSnapshot: Snapshot
  ) {
    const presentTime = playerSnapshot.time
    let currentTime = serverSnapshot.time

    restoreEngineFromSnapshot(this.mePlayerEngine, serverSnapshot, {
      includeNonServerControlled: true,
    })

    while (currentTime < presentTime) {
      this.clientInputHistory.forEach((input) => {
        if (!this.mePlayerEngine.game.me) return
        if (
          input.time >= currentTime &&
          input.time < currentTime + Engine.MIN_DELTA
        ) {
          switch (input.action) {
            case ClientInputAction.ROTATE_START:
              this.mePlayerEngine.game.me.isRotating = true
              break
            case ClientInputAction.ROTATE_END:
              this.mePlayerEngine.game.me.isRotating = false
              break
            case ClientInputAction.DASH:
              this.mePlayerEngine.game.me.dash()
              break
            case ClientInputAction.SHOOT:
              this.mePlayerEngine.game.me.shoot()
              break
          }
        }
      })

      currentTime += Engine.MIN_DELTA

      this.mePlayerEngine.update(Engine.MIN_DELTA)
    }
  }

  reconcileBullets() {
    const { serverSnapshot, playerSnapshot } = this.getLatestSnapshots()

    if (serverSnapshot && playerSnapshot) {
      this.reconcileBulletsBySnapshots(serverSnapshot, playerSnapshot)
    }
  }

  reconcileBulletsBySnapshots(
    serverSnapshot: Snapshot,
    playerSnapshot: Snapshot
  ) {
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

  getLatestSnapshots = (): {
    serverSnapshot: Snapshot | undefined
    playerSnapshot: Snapshot | undefined
  } => {
    const serverSnapshot = this.snapshots.vault.get() as Snapshot | undefined
    const playerSnapshot = this.clientSnapshotsVault.get() as
      | Snapshot
      | undefined

    return { serverSnapshot, playerSnapshot }
  }

  syncPlayerByMeEngine() {
    const clientPlayer = this.engine.game.me
    const serverPlayer = this.mePlayerEngine.game.me

    if (!clientPlayer || !serverPlayer) return

    const offsetX = clientPlayer.body.position.x - serverPlayer.body.position.x
    const offsetY = clientPlayer.body.position.y - serverPlayer.body.position.y
    const offsetAngle = clientPlayer.angle - serverPlayer.angle
    const positionCorrectionCoeff =
      200 - map(Math.max(Math.abs(offsetX), Math.abs(offsetY)), 0, 20, 20, 100)
    const angleCorrectionCoeff = 60

    // Apply a step by step correction of the player's position
    Matter.Body.setPosition(
      clientPlayer.body,
      Matter.Vector.create(
        clientPlayer.body.position.x - offsetX / positionCorrectionCoeff,
        clientPlayer.body.position.y - offsetY / positionCorrectionCoeff
      )
    )
    clientPlayer.angle -= offsetAngle / angleCorrectionCoeff
  }

  frameSync(interpolation: number) {
    this.syncPlayerByMeEngine()

    const serverTime =
      SnapshotInterpolation.Now() -
      this.timeOffset -
      this.snapshots.interpolationBuffer.get()
    const shots = this.snapshots.vault.get(serverTime)

    if (!shots) return

    const { older, newer } = shots

    if (!older || !newer) return

    const playersSnapshot = this.snapshots.interpolate(
      older,
      newer,
      interpolation,
      'positionX positionY angle(deg) velocityX velocityY',
      'players'
    )
    const bulletsSnapshot = this.snapshots.interpolate(
      older,
      newer,
      interpolation,
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

  handleInitRoom({ snapshot, playerId, frame }: InitEventMessage) {
    this.engine.frame = frame

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
        const me = new Player({
          id: serverPlayer.id,
          position: { x: serverPlayer.positionX, y: serverPlayer.positionY },
          shipSprite: serverPlayer.shipSprite,
          world: this.mePlayerEngine.game.world,
        })
        me.angle = serverPlayer.angle
        me.aliveState = serverPlayer.aliveState
        me.bullets = serverPlayer.bullets
        me.body.collisionFilter = {
          mask: World.WALL_COLLISION_CATEGORY,
          category: Player.PLAYER_COLLISION_CATEGORY,
        }

        this.playerId = playerId
        this.engine.game.setMe(player)
        this.mePlayerEngine.addPlayer(me)
        this.mePlayerEngine.game.setMe(me)
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
    console.log('player left:', playerId)

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
      isRotating: Number(me.isRotating),
      isDashing: Number(me.isDashing),
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
      time: this.engine.frameTimestamp,
      state: {
        players: [player],
        bullets,
      },
    }
  }

  handleSnapshotRecieve(snapshot: Snapshot) {
    this.snapshots.vault.add(snapshot)
    this.timeOffset = SnapshotInterpolation.Now() - snapshot.time

    const lastDashedMs = this.engine.game.me?.lastDashedMs || 0
    const hasFinishedDashing =
      lastDashedMs + Player.DASH_TIMEOUT_MS <= Engine.now()

    this.reconcileBullets()

    /**
     * TODO: need to fix `reconcilePlayer()` function as it does some weird stuff
     * TODO: when executed multiple times and an event is being replayed in `mePlayerEngine`
     */
    if (hasFinishedDashing) {
      this.reconcilePlayer()
    }
  }

  handleRotateStart() {
    if (
      !this.engine.game.me ||
      !this.mePlayerEngine.game.me ||
      this.engine.game.me?.isRotating
    ) {
      return
    }

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

    this.clientInputHistory.push({
      action: ClientInputAction.ROTATE_START,
      time: Engine.now(),
    })

    this.engine.game.me.isRotating = true
    this.mePlayerEngine.game.me.isRotating = true
  }

  handleDash() {
    if (!this.engine.game.me || !this.mePlayerEngine.game.me) return
    if (
      !MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED &&
      this.engine.game.me.isDashing
    ) {
      return
    }

    this.channel?.emit(GameEvents.DASH, null, {
      reliable: true,
    })

    this.clientInputHistory.push({
      action: ClientInputAction.DASH,
      time: Engine.now(),
    })

    if (!MULTIPLAYER_SET_ALL_PLAYERS_AS_SERVER_CONTROLLED) {
      this.engine.game.me.dash()
      this.mePlayerEngine.game.me.dash()
    }
  }

  handleShoot() {
    if (!this.engine.game.me || this.isHoldingShootButton) return

    const bullet = this.engine.game.me.shoot()
    this.channel?.emit(GameEvents.SHOOT, bullet ? bullet.id : undefined, {
      reliable: true,
    })

    this.clientInputHistory.push({
      action: ClientInputAction.SHOOT,
      time: Engine.now(),
    })

    this.isHoldingShootButton = true
  }

  handleRotateStop() {
    if (!this.engine.game.me || !this.mePlayerEngine.game.me) return

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

    this.clientInputHistory.push({
      action: ClientInputAction.ROTATE_END,
      time: Engine.now(),
    })

    this.engine.game.me.isRotating = false
    this.mePlayerEngine.game.me.isRotating = false
  }

  handleKeyDown(keyCode: string) {
    switch (keyCode) {
      case ClientInputActionKeyCodes.ROTATE: {
        this.handleRotateStart()
        break
      }
      case ClientInputActionKeyCodes.SHOOT: {
        this.handleShoot()
        break
      }
    }
  }

  handleRotateDoubleTap() {
    if (this.rotateDoubleTapWaiting) {
      this.rotateDoubleTapWaiting = false
      clearTimeout(this.rotateDoubleTapTimer ?? undefined)
      this.handleDash()
    } else {
      this.rotateDoubleTapWaiting = true
      this.rotateDoubleTapTimer = setTimeout(
        () => (this.rotateDoubleTapWaiting = false),
        ClientEngine.DOUBLE_CLICK_TIMEFRAME
      )
    }
  }

  onKeyDown(e: KeyboardEvent) {
    const isRotateButton = e.code === ClientInputActionKeyCodes.ROTATE
    const justPressed = !this.keysPressed.has(e.code)

    if (isRotateButton && justPressed) {
      this.handleRotateDoubleTap()
    }

    this.keysPressed.add(e.code)
  }

  onKeyUp(e: KeyboardEvent) {
    this.keysPressed.delete(e.code)

    switch (e.code) {
      case ClientInputActionKeyCodes.ROTATE: {
        this.handleRotateStop()
        break
      }
      case ClientInputActionKeyCodes.SHOOT: {
        this.isHoldingShootButton = false
        break
      }
    }
  }
}

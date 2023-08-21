import {
  Engine,
  World,
  WorldEvents,
  Player as EnginePlayer,
} from '@astroparty/engine'
import Application from 'src/pixi/Application'
import Player from 'src/pixi/components/Player'
import PIXIObject from 'src/pixi/PIXIObject'
import Bullet from 'src/pixi/Bullet'
import { Graphics } from 'pixi.js'
import * as Colyseus from 'colyseus.js'
import { WS_HOSTNAME } from 'src/config/constants'
import { GameRoomState } from '@astroparty/shared/colyseus/GameSchema'
import Matter from 'matter-js'
import Debug from 'src/pixi/components/Debug'
import {
  Snapshot,
  SnapshotBuffer,
  SnapshotBullet,
  SnapshotPlayer,
} from '@astroparty/shared/colyseus/Snapshot'
import MainLoop from 'mainloop.js'

export class ClientEngine {
  snapshotBuffer: SnapshotBuffer
  client: Colyseus.Client
  engine: Engine
  room?: Colyseus.Room<GameRoomState>
  playerId: string | null
  keysPressed: Set<string> = new Set()
  private delta = 0

  constructor(engine: Engine, playerId: string | null) {
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

  async start() {
    if (!this.playerId) return

    this.room = await this.client.joinOrCreate<GameRoomState>('game', {
      playerId: this.playerId,
    })

    this.registerSocketHandlers(this.room)

    MainLoop.setBegin((timestamp, delta) => {
      this.delta += delta

      while (this.delta >= Engine.MIN_DELTA) {
        this.frameSync()
        this.delta -= Engine.MIN_DELTA
      }
    })
  }

  frameSync() {
    if (this.snapshotBuffer.length > 30) {
      this.snapshotBuffer.reset()
    }

    const currentSnapshot = this.snapshotBuffer.shift()
    if (!currentSnapshot) return

    this.syncStateBySnapshot(currentSnapshot)
  }

  syncStateBySnapshot(snapshot: Snapshot) {
    this.engine.game.world.players.forEach((player) => {
      const snapshotPlayer = snapshot.players.get(player.id)

      if (!snapshotPlayer) return
      if (!player.isServerControlled) return

      Matter.Body.setPosition(player.body, snapshotPlayer.position)
      Matter.Body.setVelocity(player.body, { x: 0, y: 0 })
      player.angle = snapshotPlayer.angle
      player.aliveState = snapshotPlayer.aliveState
      player.bullets = snapshotPlayer.bullets
    })

    this.engine.game.world.bullets.forEach((bullet) => {
      const snapshotBullet = snapshot.bullets.get(bullet.id)

      if (!snapshotBullet) return

      Matter.Body.setPosition(bullet.body, snapshotBullet.position)
      Matter.Body.setVelocity(bullet.body, { x: 0, y: 0 })
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

  registerSocketHandlers(room: Colyseus.Room<GameRoomState>) {
    room.onStateChange((state) => {
      this.snapshotBuffer.push(this.generateSnapshot(state))
    })
  }

  handleKeyDown(keyCode: string) {
    // if (!this.engine.game.me) return

    switch (keyCode) {
      case 'ArrowRight':
        this.room?.send('rotate', 'start')
        // this.engine.game.me.isRotating = true
        break
      case 'KeyW':
        this.room?.send('dash')
        // this.engine.game.me.dash()
        break
      case 'Space':
        this.room?.send('shoot')
        // this.engine.game.me.shoot()
        break
    }
  }

  onKeyDown(e: KeyboardEvent) {
    this.keysPressed.add(e.code)
  }

  onKeyUp(e: KeyboardEvent) {
    this.keysPressed.delete(e.code)

    // if (!this.engine.game.me) return

    switch (e.key) {
      case 'ArrowRight':
        this.room?.send('rotate', 'stop')
        // this.engine.game.me.isRotating = false
        break
    }
  }
}

class MainScene extends PIXIObject {
  app: Application
  players: Map<string, Player>
  bullets: Map<string, Bullet>
  debug: Debug
  clientEngine: ClientEngine
  playerId: string | null

  constructor(app: Application, engine: Engine) {
    super(app, engine)
    const params = new URLSearchParams(window.location.search)
    this.app = app
    this.players = new Map()
    this.bullets = new Map()
    this.playerId = params.get('id')
    this.clientEngine = new ClientEngine(engine, this.playerId)

    // this.position.set(
    //   window.innerWidth / 2 - World.WORLD_WIDTH / 2,
    //   window.innerHeight / 2 - World.WORLD_HEIGHT / 2
    // )

    for (const player of this.clientEngine.engine.game.world.getAllPlayersIterator()) {
      const pixiPlayer = new Player(player)
      this.players.set(player.id, pixiPlayer)
      this.addChild(pixiPlayer)
    }

    for (const bullet of this.clientEngine.engine.game.world.getAllBulletsIterator()) {
      const pixiBullet = new Bullet(bullet)
      this.bullets.set(bullet.id, pixiBullet)
      this.addChild(pixiBullet)
    }

    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.BULLET_SPAWN,
      this.handleBulletSpawn.bind(this)
    )
    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.BULLET_DESTROYED,
      this.handleBulletDestroyed.bind(this)
    )

    const rect = new Graphics()
    rect.lineStyle({
      color: 0xffffff,
      width: 2,
    })
    rect.drawRect(0, 0, World.WORLD_WIDTH, World.WORLD_HEIGHT)
    this.addChild(rect)

    this.debug = new Debug(this.clientEngine)
    this.addChild(this.debug)

    this.clientEngine.init()
    this.clientEngine.engine.start()
  }

  handleBulletSpawn(bulletId: string) {
    const bullet = this.engine.game.world.bullets.get(bulletId)

    if (!bullet) {
      throw new Error(
        `В событии BULLET_SPAWN передан несуществующий id: ${bulletId}`
      )
    }

    const pixiBullet = new Bullet(bullet)
    this.bullets.set(bullet.id, pixiBullet)
    this.addChild(pixiBullet)
  }

  handleBulletDestroyed(bulletId: string) {
    const engineBullet = this.engine.game.world.bullets.get(bulletId)

    if (!engineBullet) {
      throw new Error(
        `В событии BULLET_DESTROYED передан несуществующий id: ${bulletId}`
      )
    }

    this.bullets.delete(engineBullet.id)
    const bullet = this.children.find((e) => {
      if (e instanceof Bullet && e.engineBullet.id === engineBullet.id) {
        return e
      }
    })

    if (!bullet) {
      throw new Error(
        `На stage не найден объект Bullet с id ${engineBullet.id}`
      )
    }

    this.removeChild(bullet)
  }

  async init() {
    await this.clientEngine.start()

    // TODO: fixme
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.clientEngine.room?.onMessage('init_room', (data: any) => {
      if (!this.playerId) return

      console.log('init_room', data)

      Object.entries(data.players).forEach(
        // TODO: fixme
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ([id, serverPlayer]: [string, any]) => {
          const player = new EnginePlayer(
            id,
            serverPlayer.position,
            this.engine.game.world
          )
          player.angle = serverPlayer.angle
          player.aliveState = serverPlayer.aliveState
          player.bullets = serverPlayer.bullets
          // player.setServerControlled(this.playerId !== id)
          player.setServerControlled(true)
          this.engine.addPlayer(player)

          // if (this.playerId === id) {
          //   this.engine.game.setMe(player)
          // }

          const pixiPlayer = new Player(player)
          this.players.set(player.id, pixiPlayer)
          this.addChild(pixiPlayer)
        }
      )
    })

    // TODO: fixme
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.clientEngine.room?.onMessage('player_join', (serverPlayer: any) => {
      if (!this.playerId) return

      console.log('player_join', serverPlayer)

      const player = new EnginePlayer(
        serverPlayer.id,
        serverPlayer.position,
        this.engine.game.world
      )
      player.angle = serverPlayer.angle
      player.aliveState = serverPlayer.aliveState
      player.bullets = serverPlayer.bullets
      player.setServerControlled(true)
      this.engine.game.world.players.set(player.id, player)

      const pixiPlayer = new Player(player)
      this.players.set(player.id, pixiPlayer)
      this.addChild(pixiPlayer)
    })

    this.clientEngine.room?.onMessage('player_left', (playerId: string) => {
      if (!this.playerId) return

      console.log(
        'player_left',
        playerId,
        this.engine.game.world.players,
        this.players
      )

      this.engine.removePlayer(playerId)
      this.players.delete(playerId)
    })
  }

  update(interpolation: number) {
    this.players.forEach((player) => {
      player.update(interpolation)
    })
    this.bullets.forEach((bullet) => {
      bullet.update(interpolation)
    })
    this.debug.update()
  }
}

export default MainScene

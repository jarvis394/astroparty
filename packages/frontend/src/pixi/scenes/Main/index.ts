import { Engine, World, WorldEvents } from '@astroparty/engine'
import Application from 'src/pixi/Application'
import Player from 'src/pixi/components/Player'
import PIXIObject from 'src/pixi/PIXIObject'
import Bullet from 'src/pixi/components/Bullet'
import { Graphics } from 'pixi.js'
import { ClientEngine, ClientEngineEvents } from 'src/models/ClientEngine'
import Debug from 'src/pixi/components/Debug'
import { Snapshot, SnapshotPlayer } from '@astroparty/shared/game/Snapshot'
import { Viewport } from 'pixi-viewport'
import Matter from 'matter-js'

class MainScene extends PIXIObject {
  app: Application
  players: Map<string, Player>
  bullets: Map<string, Bullet>
  debug: Debug
  clientEngine: ClientEngine
  playerId: string | null
  viewport: Viewport

  constructor(app: Application, engine: Engine) {
    super(app, engine)
    const params = new URLSearchParams(window.location.search)
    this.app = app
    this.players = new Map()
    this.bullets = new Map()
    this.playerId = params.get('id')
    this.clientEngine = new ClientEngine(engine, this.playerId)
    this.viewport = new Viewport({
      events: app.renderer.events,
      worldHeight: World.WORLD_HEIGHT + 32 * 2,
      worldWidth: World.WORLD_WIDTH + 32 * 2,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    })

    for (const player of this.clientEngine.engine.game.world.getAllPlayersIterator()) {
      const pixiPlayer = new Player(player)
      this.players.set(player.id, pixiPlayer)
      this.viewport.addChild(pixiPlayer)
    }

    for (const bullet of this.clientEngine.engine.game.world.getAllBulletsIterator()) {
      const pixiBullet = new Bullet(bullet)
      this.bullets.set(bullet.id, pixiBullet)
      this.viewport.addChild(pixiBullet)
    }

    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.BULLET_SPAWN,
      this.handleBulletSpawn.bind(this)
    )
    this.clientEngine.engine.game.world.addEventListener(
      WorldEvents.BULLET_DESPAWN,
      this.handleBulletDespawn.bind(this)
    )

    const worldBorder = new Graphics()
    worldBorder.lineStyle({
      color: 0xffffff,
      width: 2,
    })
    worldBorder.drawRect(0, 0, World.WORLD_WIDTH, World.WORLD_HEIGHT)
    this.viewport.addChild(worldBorder)

    const rect = new Graphics()
    rect.lineStyle({
      color: 0xffffff,
      width: 2,
    })
    rect.drawRect(
      World.WORLD_WIDTH / 2 - 50,
      World.WORLD_HEIGHT / 2 - 50,
      100,
      100
    )
    this.viewport.addChild(rect)

    this.debug = new Debug(this.clientEngine)
    this.addChild(this.debug)

    this.initViewport()

    this.clientEngine.init()
    this.clientEngine.engine.start()
  }

  initViewport() {
    this.viewport.moveCenter(World.WORLD_WIDTH / 2, World.WORLD_HEIGHT / 2)
    this.viewport.fit(true)
    this.addChild(this.viewport)
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
    this.viewport.addChild(pixiBullet)
  }

  handleBulletDespawn(bulletId: string) {
    const engineBullet = this.engine.game.world.bullets.get(bulletId)

    if (!engineBullet) {
      throw new Error(
        `В событии BULLET_DESTROYED передан несуществующий id: ${bulletId}`
      )
    }

    this.bullets.delete(bulletId)
    const bullet = this.viewport.children.find((e) => {
      if (e instanceof Bullet && e.engineBullet.id === bulletId) {
        return e
      }
    })

    if (!bullet) {
      throw new Error(`На stage не найден объект Bullet с id ${bulletId}`)
    }

    this.viewport.removeChild(bullet)
  }

  handleInitRoom(snapshot: Snapshot) {
    if (!this.playerId) return

    Object.values(snapshot.state.players).forEach((serverPlayer) => {
      const enginePlayer = this.clientEngine.engine.game.world.getPlayerByID(
        serverPlayer.id
      )

      if (!enginePlayer) {
        throw new Error(
          `При событии "${ClientEngineEvents.INIT_ROOM}" не получилось найти игрока в движке с ID ${serverPlayer.id}`
        )
      }

      const pixiPlayer = new Player(enginePlayer)
      this.players.set(serverPlayer.id, pixiPlayer)
      this.viewport.addChild(pixiPlayer)
    })

    Object.values(snapshot.state.bullets).forEach((serverBullet) => {
      const engineBullet = this.clientEngine.engine.game.world.getBulletByID(
        serverBullet.id
      )

      if (!engineBullet) {
        throw new Error(
          `При событии "${ClientEngineEvents.INIT_ROOM}" не получилось найти пульку в движке с ID ${serverBullet.id}`
        )
      }

      const pixiBullet = new Bullet(engineBullet)
      this.bullets.set(serverBullet.id, pixiBullet)
      this.viewport.addChild(pixiBullet)
    })
  }

  handlePlayerJoin(serverPlayer: SnapshotPlayer) {
    if (!this.playerId) return

    const enginePlayer = this.clientEngine.engine.game.world.getPlayerByID(
      serverPlayer.id
    )

    if (!enginePlayer) {
      throw new Error(
        `При событии "${ClientEngineEvents.PLAYER_JOIN}" не получилось найти игрока в движке с ID ${serverPlayer.id}`
      )
    }

    const pixiPlayer = new Player(enginePlayer)
    this.players.set(enginePlayer.id, pixiPlayer)
    this.viewport.addChild(pixiPlayer)
  }

  handlePlayerLeft(playerId: string) {
    if (!this.playerId) return

    const pixiPlayer = this.viewport.children.find((e) => {
      if (e instanceof Player && e.enginePlayer.id === playerId) {
        return e
      }
    })

    if (!pixiPlayer) {
      throw new Error(`На stage не найден объект Player с id ${playerId}`)
    }

    this.viewport.removeChild(pixiPlayer)
    this.players.delete(playerId)
  }

  async init() {
    await this.clientEngine.startGame()

    this.clientEngine.addEventListener(
      ClientEngineEvents.INIT_ROOM,
      this.handleInitRoom.bind(this)
    )

    this.clientEngine.addEventListener(
      ClientEngineEvents.PLAYER_JOIN,
      this.handlePlayerJoin.bind(this)
    )

    this.clientEngine.addEventListener(
      ClientEngineEvents.PLAYER_LEFT,
      this.handlePlayerLeft.bind(this)
    )
  }

  fitViewport() {
    const min: Matter.Vector = {
      x: World.WORLD_WIDTH * 2,
      y: World.WORLD_HEIGHT * 2,
    }
    const max: Matter.Vector = { x: 0, y: 0 }

    this.engine.game.world.players.forEach((player) => {
      const { x, y } = player.body.position

      min.x = Math.min(x - 32, min.x)
      min.y = Math.min(y - 32, min.y)
      max.x = Math.max(x + 32, max.x)
      max.y = Math.max(y + 32, max.y)
    })

    let x = (max.x - min.x) / 2 + min.x
    let y = (max.y - min.y) / 2 + min.y
    let scale = Math.min(
      window.innerWidth / (max.x - min.x + 64),
      window.innerHeight / (max.y - min.y + 64)
    )
    // let width = World.WORLD_WIDTH * 2

    // if (scale < 1) {
    //   scale = 1
    // }

    // if (scale > 1.5) {
    //   scale = 1.5
    // }

    if (this.engine.game.world.players.size === 1) {
      x = max.x
      y = max.y
      scale = 1
    }

    if (this.engine.game.world.players.size === 0) {
      x = World.WORLD_WIDTH / 2
      y = World.WORLD_HEIGHT / 2
      scale = 1
    }

    this.viewport.animate({
      time: 100,
      position: { x, y },
      height: window.innerHeight,
      width: window.innerWidth,
      scale,
      ease: 'linear',
      removeOnInterrupt: false,
    })
  }

  update(interpolation: number) {
    this.clientEngine.frameSync(interpolation)

    this.players.forEach((player) => {
      player.update(interpolation)
    })
    this.bullets.forEach((bullet) => {
      bullet.update()
    })
    this.debug.update()

    // this.fitViewport()
  }
}

export default MainScene

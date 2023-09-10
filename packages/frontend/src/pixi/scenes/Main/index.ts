import { Engine, World, WorldEvents } from '@astroparty/engine'
import Application from 'src/pixi/Application'
import Player from 'src/pixi/components/Player'
import PIXIObject from 'src/pixi/PIXIObject'
import Bullet from 'src/pixi/components/Bullet'
import { Graphics } from 'pixi.js'
import { ClientEngine, ClientEngineEvents } from 'src/models/ClientEngine'
import Debug from 'src/pixi/components/Debug'
import { Snapshot, SnapshotPlayer } from '@astroparty/shared/game/Snapshot'
import Viewport from './Viewport'
import Attractor from 'src/pixi/components/Attractor'

class MainScene extends PIXIObject {
  app: Application
  players: Map<string, Player>
  bullets: Map<string, Bullet>
  attractors: Attractor[]
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
    this.attractors = []
    this.playerId = params.get('id')
    this.clientEngine = new ClientEngine(engine, this.playerId)
    this.viewport = new Viewport(app, engine)
    this.debug = new Debug(this.clientEngine)

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

    for (const attractor of this.clientEngine.engine.game.world.attractors) {
      const pixiAttractor = new Attractor(attractor)
      this.attractors.push(pixiAttractor)
      this.addChild(pixiAttractor)
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

    this.addChild(this.debug)
    this.addChild(this.viewport.root)

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

  update(interpolation: number) {
    this.clientEngine.frameSync(interpolation)

    this.players.forEach((player) => {
      player.update(interpolation)
    })
    this.bullets.forEach((bullet) => {
      bullet.update()
    })
    this.attractors.forEach((attractor) => {
      attractor.update(interpolation)
    })
    this.debug.update()

    this.viewport.fit()
  }
}

export default MainScene

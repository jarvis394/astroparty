import { Engine, World, WorldEvents } from '@astroparty/engine'
import Application from 'src/pixi/Application'
import Player from 'src/pixi/components/Player'
import PIXIObject from 'src/pixi/PIXIObject'
import Bullet from 'src/pixi/Bullet'
import { Graphics } from 'pixi.js'
import * as Colyseus from 'colyseus.js'
import { WS_HOSTNAME } from 'src/config/constants'
import { GameRoomState } from '@astroparty/multiplayer/dist/rooms/game/game.schema'

class MainScene extends PIXIObject {
  engine: Engine
  app: Application
  client: Colyseus.Client
  players: Map<string, Player>
  bullets: Map<string, Bullet>
  room?: Colyseus.Room<GameRoomState>

  constructor(app: Application, engine: Engine) {
    super(app, engine)
    this.app = app
    this.engine = engine
    this.players = new Map()
    this.bullets = new Map()
    this.client = new Colyseus.Client(WS_HOSTNAME)

    // this.position.set(
    //   window.innerWidth / 2 - World.WORLD_WIDTH / 2,
    //   window.innerHeight / 2 - World.WORLD_HEIGHT / 2
    // )

    for (const player of this.engine.game.world.getAllPlayersIterator()) {
      const pixiPlayer = new Player(player)
      this.players.set(player.id, pixiPlayer)
      this.addChild(pixiPlayer)
    }

    for (const bullet of this.engine.game.world.getAllBulletsIterator()) {
      const pixiBullet = new Bullet(bullet)
      this.bullets.set(bullet.id, pixiBullet)
      this.addChild(pixiBullet)
    }

    this.engine.game.world.addEventListener(
      WorldEvents.BULLET_SPAWN,
      this.handleBulletSpawn.bind(this)
    )
    this.engine.game.world.addEventListener(
      WorldEvents.BULLET_DESTROYED,
      this.handleBulletDestroyed.bind(this)
    )

    const rect = new Graphics()
    rect.lineStyle({
      color: 0xffffff,
      width: 2,
    })
    rect.drawRect(0, 0, World.WORLD_WIDTH, World.WORLD_HEIGHT)
    // this.addChild(rect)
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
    this.room = await this.client.joinOrCreate<GameRoomState>('game')
    const myId = this.room.sessionId
    this.room.state.players.onAdd((player, id) => {
      const enginePlayer = this.engine.addPlayer(id)

      enginePlayer.body.position = player.position
      enginePlayer.body.angle = player.angle
      enginePlayer.aliveState = player.aliveState
      enginePlayer.bullets = player.bullets

      if (id === myId) {
        this.engine.game.setMe(enginePlayer)
      }

      const pixiPlayer = new Player(enginePlayer)
      this.players.set(player.id, pixiPlayer)
      this.addChild(pixiPlayer)
    })
  }

  update(interpolation: number) {
    this.players.forEach((player) => {
      player.update(interpolation)
    })

    this.bullets.forEach((bullet) => {
      bullet.update(interpolation)
    })
  }
}

export default MainScene

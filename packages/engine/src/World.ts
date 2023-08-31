import Matter from 'matter-js'
import Bullet from './Bullet'
import Player, { AliveState } from './Player'
import EventEmitter from './EventEmitter'
import { ShipSprite } from '@astroparty/shared/types/ShipSprite'

export enum WorldEvents {
  BULLET_SPAWN = 'bullet_spawn',
  BULLET_DESPAWN = 'bullet_despawn',
  PLAYER_SPAWN = 'player_spawn',
  PLAYER_DESPAWN = 'player_despawn',
}

type WorldEmitterEvents = {
  [WorldEvents.BULLET_SPAWN]: (bulletId: string) => void
  [WorldEvents.BULLET_DESPAWN]: (bulletId: string) => void
  [WorldEvents.PLAYER_SPAWN]: (playerId: string) => void
  [WorldEvents.PLAYER_DESPAWN]: (playerId: string) => void
}

class World extends EventEmitter<WorldEmitterEvents> {
  public static WORLD_HEIGHT = 1024
  public static WORLD_WIDTH = 1024
  private static WALL_HEIGHT = 50
  private static WALL_PREFIX = 'wall'

  instance: Matter.World
  walls: Matter.Body[]
  bullets: Map<string, Bullet> = new Map()
  players: Map<string, Player> = new Map()
  // TODO: убрать, юзать айдишники из бд
  /** Используется для вычисления ID новой пульки при её создании */
  bulletsShot = 0

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    super()
    this.instance = matterEngine.world
    this.walls = this.addWorldWalls()

    Matter.Events.on(matterEngine, 'collisionStart', (event) => {
      for (const { bodyA, bodyB } of event.pairs) {
        const [a, b] = [bodyA, bodyB].sort((a) => (Bullet.isBullet(a) ? -1 : 1))
        const bulletId = Bullet.getIdFromLabel(a.label)
        const playerId = Player.getIdFromLabel(b.label)
        const player = this.players.get(playerId)
        const bullet = this.bullets.get(bulletId)

        if (
          player &&
          bullet &&
          Bullet.isBullet(a) &&
          Player.isPlayer(b) &&
          player.isOpponent &&
          bullet.playerId !== player.id &&
          this.bullets.has(bulletId)
        ) {
          Matter.World.remove(this.instance, a)
          this.eventEmitter.emit(WorldEvents.BULLET_DESPAWN, bulletId)
          if (player.aliveState === AliveState.ALIVE) {
            player.makeCraftDestroyed()
          }
          return this.bullets.delete(bulletId)
        }

        if (this.bullets.has(bulletId) && b.label === World.WALL_PREFIX) {
          Matter.World.remove(this.instance, a)
          this.eventEmitter.emit(WorldEvents.BULLET_DESPAWN, bulletId)
          return this.bullets.delete(bulletId)
        }
      }
    })
  }

  public addBullet(bullet: Bullet) {
    this.bulletsShot += 1
    this.bullets.set(bullet.id, bullet)
    Matter.World.addBody(this.instance, bullet.body)
    this.eventEmitter.emit(WorldEvents.BULLET_SPAWN, bullet.id)
  }

  public getAllBulletsIterator(): IterableIterator<Bullet> {
    return this.bullets.values()
  }

  public createPlayer(id: string): Player {
    const spawnPositions = [
      Matter.Vector.create(100, 100),
      Matter.Vector.create(World.WORLD_WIDTH - 100, World.WORLD_HEIGHT - 100),
      Matter.Vector.create(World.WORLD_WIDTH - 100, 100),
      Matter.Vector.create(100, World.WORLD_HEIGHT - 100),
    ]
    const n = this.players.size % spawnPositions.length

    return new Player({
      id,
      position: spawnPositions[n],
      shipSprite: ShipSprite.BLUE,
      world: this,
    })
  }

  public createBullet(
    player: Player,
    id: string = (this.bulletsShot + 1).toString()
  ): Bullet {
    return new Bullet(id, player)
  }

  public addPlayer(player: Player): Player {
    this.players.set(player.id, player)
    this.eventEmitter.emit(WorldEvents.PLAYER_SPAWN, player.id)
    return player
  }

  public removePlayer(id: string): boolean {
    const player = this.getPlayerByID(id)

    if (!player) return false

    Matter.World.remove(this.instance, player.body)
    this.eventEmitter.emit(WorldEvents.PLAYER_DESPAWN, player.id)
    return this.players.delete(id)
  }

  public removeBullet(id: string): boolean {
    const bullet = this.getBulletByID(id)

    if (!bullet) return false

    Matter.World.remove(this.instance, bullet.body)
    this.eventEmitter.emit(WorldEvents.BULLET_DESPAWN, bullet.id)
    return this.bullets.delete(id)
  }

  public getPlayerByID(id: string) {
    return this.players.get(id)
  }

  public getBulletByID(id: string) {
    return this.bullets.get(id)
  }

  public doesPlayerExistByID(id: string) {
    return this.players.has(id)
  }

  public getAllPlayersIterator(): IterableIterator<Player> {
    return this.players.values()
  }

  public update() {
    this.players.forEach((player) => {
      player.update()
    })

    this.bullets.forEach((bullet) => {
      bullet.update()
    })
  }

  private addWorldWalls(): Matter.Body[] {
    const wallOptions: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0,
      restitution: 0,
      mass: 0,
      label: World.WALL_PREFIX,
    }

    const bodies = [
      // Top
      Matter.Bodies.rectangle(
        World.WORLD_WIDTH / 2,
        -World.WALL_HEIGHT / 2,
        World.WORLD_WIDTH + World.WALL_HEIGHT * 2,
        World.WALL_HEIGHT,
        wallOptions
      ),
      // Left
      Matter.Bodies.rectangle(
        -World.WALL_HEIGHT / 2,
        World.WORLD_HEIGHT / 2,
        World.WALL_HEIGHT,
        World.WORLD_HEIGHT + World.WALL_HEIGHT * 2,
        wallOptions
      ),
      // Bottom
      Matter.Bodies.rectangle(
        World.WORLD_WIDTH / 2,
        World.WORLD_HEIGHT + World.WALL_HEIGHT / 2,
        World.WORLD_WIDTH + World.WALL_HEIGHT * 2,
        World.WALL_HEIGHT,
        wallOptions
      ),
      // Right
      Matter.Bodies.rectangle(
        World.WORLD_WIDTH + World.WALL_HEIGHT / 2,
        World.WORLD_HEIGHT / 2,
        World.WALL_HEIGHT,
        World.WORLD_HEIGHT + World.WALL_HEIGHT * 2,
        wallOptions
      ),
    ]

    Matter.World.add(this.instance, bodies)

    return bodies
  }
}

export default World

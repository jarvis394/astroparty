import Matter from 'matter-js'
import Bullet from './Bullet'
import Player, { AliveState } from './Player'
import { EventEmitter } from 'events'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (...args: any[]) => void

export enum WorldEvents {
  BULLET_SPAWN = 'bullet_spawn',
  BULLET_DESTROYED = 'bullet_destroyed',
}

class World {
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
  private eventEmitter = new EventEmitter()

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    this.instance = matterEngine.world
    this.walls = this.addWorldWalls()

    Matter.Events.on(matterEngine, 'collisionStart', (event) => {
      for (const { bodyA, bodyB } of event.pairs) {
        const [a, b] = [bodyA, bodyB].sort((a) => (Bullet.isBullet(a) ? -1 : 1))
        const bulletId = Bullet.getIdFromLabel(a.label)
        const playerId = Player.getIdFromLabel(b.label)
        const player = this.players.get(playerId)

        if (
          Player.isPlayer(b) &&
          player?.isOpponent &&
          this.bullets.has(bulletId) &&
          player
        ) {
          Matter.World.remove(this.instance, a)
          this.eventEmitter.emit(WorldEvents.BULLET_DESTROYED, bulletId)
          if (player.aliveState === AliveState.ALIVE) {
            player.makeCraftDestroyed()
          }
          return this.bullets.delete(bulletId)
        }

        if (this.bullets.has(bulletId) && b.label === World.WALL_PREFIX) {
          Matter.World.remove(this.instance, a)
          this.eventEmitter.emit(WorldEvents.BULLET_DESTROYED, bulletId)
          return this.bullets.delete(bulletId)
        }
      }
    })
  }

  public addEventListener(type: string | symbol, listener: Listener) {
    this.eventEmitter.addListener(type, listener)
  }

  public removeEventListener(type: string | symbol, listener: Listener) {
    this.eventEmitter.removeListener(type, listener)
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

    return new Player(
      id,
      spawnPositions[this.players.size % spawnPositions.length],
      this
    )
  }

  public addPlayer(player: Player) {
    this.players.set(player.id, player)
  }

  public getPlayerByID(id: string) {
    return this.players.get(id)
  }

  public doesPlayerExistByID(id: string) {
    return this.players.has(id)
  }

  public getAllPlayersIterator(): IterableIterator<Player> {
    return this.players.values()
  }

  public update(interpolation: number) {
    this.bullets.forEach((bullet) => {
      bullet.update(interpolation)
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
        World.WORLD_WIDTH,
        World.WALL_HEIGHT,
        wallOptions
      ),
      // Left
      Matter.Bodies.rectangle(
        -World.WALL_HEIGHT / 2,
        World.WORLD_HEIGHT / 2,
        World.WALL_HEIGHT,
        World.WORLD_HEIGHT,
        wallOptions
      ),
      // Bottom
      Matter.Bodies.rectangle(
        World.WORLD_WIDTH / 2,
        World.WORLD_HEIGHT + World.WALL_HEIGHT / 2,
        World.WORLD_WIDTH,
        World.WALL_HEIGHT,
        wallOptions
      ),
      // Right
      Matter.Bodies.rectangle(
        World.WORLD_WIDTH + World.WALL_HEIGHT / 2,
        World.WORLD_HEIGHT / 2,
        World.WALL_HEIGHT,
        World.WORLD_HEIGHT,
        wallOptions
      ),
    ]

    Matter.World.add(this.instance, bodies)

    return bodies
  }
}

export default World

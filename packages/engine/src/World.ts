import Matter from 'matter-js'
import Bullet, { BulletConstructorProps } from './Bullet'
import Player, { AliveState } from './Player'
import EventEmitter from './EventEmitter'
import { ShipSprite } from '@astroparty/shared/types/ShipSprite'
import AttractionSphere from './AttractionSphere'

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
  public static WORLD_HEIGHT = 1100
  public static WORLD_WIDTH = 1100
  public static WALL_COLLISION_CATEGORY = 0x0001
  private static WALL_HEIGHT = 50
  private static WALL_PREFIX = 'wall'

  instance: Matter.World
  matterEngine: Matter.Engine
  walls: Matter.Body[]
  attractors: AttractionSphere[] = []
  bullets: Map<string, Bullet> = new Map()
  players: Map<string, Player> = new Map()
  // TODO: убрать, юзать айдишники из бд
  /** Используется для вычисления ID новой пульки при её создании */
  bulletsShot = 0

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    super()
    this.instance = matterEngine.world
    this.matterEngine = matterEngine
    this.walls = this.addWorldWalls()
    this.addObstacles()
    this.attractors = [
      new AttractionSphere(
        { x: World.WORLD_WIDTH / 4, y: World.WORLD_HEIGHT / 2 },
        this
      ),
      new AttractionSphere(
        { x: (World.WORLD_WIDTH / 4) * 3, y: World.WORLD_HEIGHT / 2 },
        this
      ),
    ]

    Matter.Events.on(matterEngine, 'collisionStart', (event) => {
      this.handleBulletCollisions(event)
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
    const player = new Player({
      id,
      position: spawnPositions[n],
      shipSprite: ShipSprite.BLUE,
      world: this,
    })

    return player
  }

  public createBullet({
    id = (this.bulletsShot + 1).toString(),
    ...props
  }: Omit<BulletConstructorProps, 'id'> & { id?: Player['id'] }): Bullet {
    return new Bullet({
      ...props,
      id,
    })
  }

  public addPlayer(player: Player): Player {
    this.players.set(player.id, player)
    this.eventEmitter.emit(WorldEvents.PLAYER_SPAWN, player.id)
    Matter.World.addBody(this.instance, player.body)
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

  private handleBulletCollisions(event: Matter.IEventCollision<Matter.Engine>) {
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
        this.bullets.has(bulletId)
      ) {
        Matter.World.remove(this.instance, a)
        this.eventEmitter.emit(WorldEvents.BULLET_DESPAWN, bulletId)
        if (player.aliveState === AliveState.ALIVE) {
          player.aliveState = AliveState.CRAFT_DESTROYED
        }
        return this.bullets.delete(bulletId)
      }

      if (this.bullets.has(bulletId) && b.label === World.WALL_PREFIX) {
        Matter.World.remove(this.instance, a)
        this.eventEmitter.emit(WorldEvents.BULLET_DESPAWN, bulletId)
        return this.bullets.delete(bulletId)
      }
    }
  }

  private addWorldWalls(): Matter.Body[] {
    const wallOptions: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0,
      restitution: 0,
      mass: 0,
      label: World.WALL_PREFIX,
      collisionFilter: {
        category: World.WALL_COLLISION_CATEGORY,
      },
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

  private addObstacles(): Matter.Body[] {
    const wallOptions: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0,
      restitution: 0,
      mass: 0,
      label: World.WALL_PREFIX,
      collisionFilter: {
        category: World.WALL_COLLISION_CATEGORY,
      },
    }

    const bodies = [
      Matter.Bodies.rectangle(
        World.WORLD_WIDTH / 2,
        World.WORLD_HEIGHT / 2,
        World.WALL_HEIGHT * 2,
        World.WALL_HEIGHT * 2,
        wallOptions
      ),
    ]

    Matter.World.add(this.instance, bodies)

    return bodies
  }
}

export default World

import Matter from 'matter-js'

class World {
  public static WORLD_HEIGHT = 1024.0
  public static WORLD_WIDTH = 1024.0
  private static WALL_HEIGHT = 10.0

  instance: Matter.World
  walls: Matter.Body[]

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    this.instance = matterEngine.world
    this.walls = this.addWorldWalls()
  }

  private addWorldWalls(): Matter.Body[] {
    // const bodies: planck.Body[] = []
    // const wallDefs = [
    //   {
    //     position: planck.Vec2(World.WORLD_WIDTH / 2, -World.WALL_HEIGHT / 2),
    //     dimensions: { hx: World.WORLD_WIDTH, hy: World.WALL_HEIGHT },
    //   },
    //   {
    //     position: planck.Vec2(
    //       World.WORLD_WIDTH / 2,
    //       World.WORLD_HEIGHT + World.WALL_HEIGHT / 2
    //     ),
    //     dimensions: { hx: World.WORLD_WIDTH, hy: World.WALL_HEIGHT },
    //   },
    //   {
    //     position: planck.Vec2(
    //       World.WORLD_WIDTH + World.WALL_HEIGHT / 2,
    //       World.WORLD_HEIGHT / 2
    //     ),
    //     dimensions: { hx: World.WALL_HEIGHT, hy: World.WORLD_HEIGHT },
    //   },
    //   {
    //     position: planck.Vec2(-World.WALL_HEIGHT / 2, World.WORLD_HEIGHT / 2),
    //     dimensions: { hx: World.WALL_HEIGHT, hy: World.WORLD_HEIGHT },
    //   },
    // ]

    // for (const wallDef of wallDefs) {
    //   const wallBody = this.instance.createBody({
    //     position: wallDef.position,
    //     type: 'static',
    //   })
    //   const wallBox = planck.Box(
    //     wallDef.dimensions.hx,
    //     wallDef.dimensions.hy,
    //     wallDef.position
    //   )
    //   wallBody.createFixture(wallBox, 0.0)
    //   bodies.push(wallBody)
    // }

    const wallOptions: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0,
      restitution: 0,
      mass: 0,
    }

    const bodies = [
      Matter.Bodies.rectangle(
        World.WORLD_HEIGHT / 2,
        -World.WALL_HEIGHT / 2,
        World.WORLD_WIDTH,
        World.WALL_HEIGHT,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        -World.WALL_HEIGHT / 2,
        World.WORLD_HEIGHT / 2,
        World.WALL_HEIGHT,
        World.WORLD_HEIGHT,
        wallOptions
      ),
      Matter.Bodies.rectangle(
        World.WORLD_WIDTH / 2,
        World.WORLD_HEIGHT + World.WALL_HEIGHT / 2,
        World.WORLD_WIDTH,
        World.WALL_HEIGHT,
        wallOptions
      ),
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

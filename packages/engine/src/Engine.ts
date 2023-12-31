import Game from './Game'
import Matter from 'matter-js'
import Loop from 'mainloop.js'
import Player from './Player'
import MatterAttractors from './lib/matterAttractors'

class Engine {
  static MIN_FPS = 60
  static MIN_DELTA = 1000 / Engine.MIN_FPS
  static _nowStartTime = Date.now()

  game: Game
  matterEngine: Matter.Engine
  frame: number
  frameTimestamp: number
  lastDelta: number

  constructor() {
    this.matterEngine = Matter.Engine.create({
      gravity: Matter.Vector.create(0, 0),
      constraintIterations: 6,
      positionIterations: 16,
      world: Matter.World.create({
        gravity: {
          scale: 0.1,
          x: 0,
          y: 0,
        },
      }),
    })
    this.game = new Game({
      matterEngine: this.matterEngine,
    })
    this.frame = 0
    this.frameTimestamp = this.getFrameTimestamp()
    this.lastDelta = 0

    this.initMatterPlugins()
  }

  public addPlayer(player: Player): Player {
    this.game.world.addPlayer(player)
    return player
  }

  public removePlayer(id: string): boolean {
    return this.game.world.removePlayer(id)
  }

  public createPlayer(id: string): Player {
    const player = this.game.world.createPlayer(id)
    return player
  }

  public getFrameTimestamp() {
    return Date.now()
  }

  private initMatterPlugins() {
    Matter.use(MatterAttractors as unknown as Matter.Plugin)
  }

  public update(delta: number) {
    Matter.Engine.update(this.matterEngine, delta)
    this.game.update()
    this.frame += 1
    this.frameTimestamp = this.getFrameTimestamp()
    this.lastDelta = delta
  }

  public start() {
    Loop.setSimulationTimestep(Engine.MIN_DELTA)
    Loop.setUpdate(this.update.bind(this)).start()
  }

  public destroy() {
    Loop.stop()
  }

  public static now() {
    return Date.now()
  }
}

export default Engine

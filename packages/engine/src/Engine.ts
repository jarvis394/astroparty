import Game from './Game'
import Matter from 'matter-js'
import Loop from 'mainloop.js'
import Player from './Player'

class Engine {
  static MIN_FPS = 60
  static MIN_DELTA = 1000 / Engine.MIN_FPS

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
    })
    this.game = new Game({
      matterEngine: this.matterEngine,
    })
    this.frame = 0
    this.frameTimestamp = this.getFrameTimestamp()
    this.lastDelta = 0
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
}

export default Engine

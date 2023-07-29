import Game from './Game'
import Matter from 'matter-js'
import Loop from 'mainloop.js'

class Engine {
  static BASE_FPS = 60
  static BASE_DELTA = 1000 / Engine.BASE_FPS

  game: Game
  matterEngine: Matter.Engine

  constructor() {
    this.matterEngine = Matter.Engine.create({
      gravity: Matter.Vector.create(0, 0),
    })
    this.game = new Game({
      matterEngine: this.matterEngine,
    })
  }

  public addPlayer() {
    const player = this.game.createPlayer()
    this.game.addPlayer(player)
  }

  public update(delta: number) {
    Matter.Engine.update(this.matterEngine, delta)
    this.game.update(delta)
  }

  public start() {
    const fps = Loop.getFPS()
    const delta = fps > Engine.BASE_FPS ? 1000 / fps : Engine.BASE_DELTA
    Loop.setSimulationTimestep(delta)
    Loop.setUpdate(this.update.bind(this)).start()
  }

  public destroy() {
    Loop.stop()
  }
}

export default Engine

import Game from './Game'
import Matter from 'matter-js'
import Loop from 'mainloop.js'

class Engine {
  static BASE_DELTA = 1000 / 60

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
    const baseDelta = Loop.getSimulationTimestep()
    Matter.Engine.update(this.matterEngine, baseDelta * (delta / baseDelta))
    this.game.update(delta)
  }

  public start() {
    Loop.setSimulationTimestep(Engine.BASE_DELTA)
    Loop.setUpdate(this.update.bind(this)).start()
  }

  public destroy() {
    Loop.stop()
  }
}

export default Engine

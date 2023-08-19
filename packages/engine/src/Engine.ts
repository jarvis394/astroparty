import Game from './Game'
import Matter from 'matter-js'
import Loop from 'mainloop.js'
import Player from './Player'

class Engine {
  static MIN_FPS = 60
  static MIN_DELTA = 1000 / Engine.MIN_FPS

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

  public update(delta: number) {
    Matter.Engine.update(this.matterEngine, delta)
    this.game.update()
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
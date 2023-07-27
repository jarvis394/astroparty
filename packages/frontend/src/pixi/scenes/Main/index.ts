import Engine from 'src/engine/Engine'
import Application from 'src/pixi/Application'
import Player from 'src/pixi/Player'
import PIXIObject from 'src/pixi/PIXIObject'
import * as PIXI from 'pixi.js'
import World from 'src/engine/World'

class MainScene extends PIXIObject {
  engine: Engine
  app: Application
  players: Player[]

  constructor(app: Application, engine: Engine) {
    super(app, engine)
    this.app = app
    this.engine = engine
    this.players = []

    for (const player of this.engine.game.getAllPlayersIterator()) {
      const playerSprite = new Player(player)
      this.players.push(playerSprite)
      this.addChild(playerSprite)
    }

    const rect = new PIXI.Graphics()
    rect.lineStyle({
      color: 0xffffff,
      width: 2,
    })
    rect.drawRect(0, 0, World.WORLD_WIDTH, World.WORLD_HEIGHT)
    this.addChild(rect)
  }

  init() {
    // noop
  }

  update() {
    this.players.forEach((player) => {
      player.update()
    })
  }
}

export default MainScene

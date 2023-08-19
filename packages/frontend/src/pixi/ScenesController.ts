import * as PIXI from 'pixi.js'
import PIXIObject from 'src/pixi/PIXIObject'
import Application from './Application'
import { Engine } from '@astroparty/engine'
import MainLoop from 'mainloop.js'

export default class ScenesController extends PIXI.Container {
  activeScene?: PIXIObject
  app: Application
  engine: Engine

  constructor(app: Application, engine: Engine) {
    super()
    this.app = app
    this.engine = engine

    app.stage.addChild(this)

    MainLoop.setDraw((interpolation) => {
      this.activeScene?.update(interpolation)
    }).start()
  }

  async loadScene(SceneConstructor: typeof PIXIObject) {
    if (this.activeScene) {
      this.removeChild(this.activeScene)
    }

    const newScene = new SceneConstructor(this.app, this.engine)
    this.activeScene = newScene
    this.addChild(newScene)
    await newScene.init()
  }
}

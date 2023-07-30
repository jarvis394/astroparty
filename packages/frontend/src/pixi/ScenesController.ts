import * as PIXI from 'pixi.js'
import PIXIObject from 'src/pixi/PIXIObject'
import Application from './Application'
import Engine from 'src/engine/Engine'
import MainLoop from 'mainloop.js'

export default class ScenesController extends PIXI.Container {
  activeScene?: PIXIObject
  app: Application
  engine: Engine

  constructor(app: Application, engine: Engine) {
    super()
    app.stage.addChild(this)
    this.app = app
    this.engine = engine

    MainLoop.setDraw((interpolation) => {
      this.activeScene?.update(interpolation)
    })
  }

  loadScene(SceneConstructor: typeof PIXIObject) {
    if (this.activeScene) {
      this.removeChild(this.activeScene)
    }

    const newScene = new SceneConstructor(this.app, this.engine)
    this.activeScene = newScene
    this.addChild(newScene)
    newScene.init()
  }
}

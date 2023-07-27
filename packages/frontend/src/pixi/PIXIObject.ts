import * as PIXI from 'pixi.js'
import Application from './Application'
import Engine from 'src/engine/Engine'

class PIXIObject extends PIXI.Container {
  engine: Engine
  app: PIXI.Application

  constructor(app: Application, engine: Engine) {
    super()
    this.app = app
    this.engine = engine
  }

  init() {
    // noop
  }
  update() {
    // noop
  }
}

export default PIXIObject

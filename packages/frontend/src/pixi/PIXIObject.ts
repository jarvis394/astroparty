import * as PIXI from 'pixi.js'
import Application from './Application'
import { Engine } from '@astroparty/engine'

class PIXIObject extends PIXI.Container {
  engine: Engine
  app: PIXI.Application

  constructor(app: Application, engine: Engine) {
    super()
    this.app = app
    this.engine = engine
  }

  async init() {
    // noop
  }

  update(interpolation: number) {
    console.log('interpolation:', interpolation)
  }
}

export default PIXIObject

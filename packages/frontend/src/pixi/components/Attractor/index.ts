import * as PIXI from 'pixi.js'
import { Assets } from 'pixi.js'
import { AttractionSphere as EngineAttractionSphere } from '@astroparty/engine'

class Attractor extends PIXI.Sprite {
  engineAttractor: EngineAttractionSphere

  constructor(engineAttractor: EngineAttractionSphere) {
    super(Assets.get('attractionSphere'))
    this.engineAttractor = engineAttractor
    this.scale.set(2)
    this.rotation = engineAttractor.body.angle
    this.anchor.set(0.5)
    this.position.set(
      engineAttractor.body.position.x,
      engineAttractor.body.position.y
    )
  }

  init() {
    // noop
  }

  update(interpolation: number) {
    this.angle += 1 * interpolation
  }
}

export default Attractor

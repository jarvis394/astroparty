import Matter from 'matter-js'
import * as PIXI from 'pixi.js'
import { Assets } from 'pixi.js'
import { Bullet as EngineBullet } from '@astroparty/engine'
import { lerp } from '@astroparty/shared/utils'

class Bullet extends PIXI.Sprite {
  engineBullet: EngineBullet
  previousPosition: Matter.Vector

  constructor(engineBullet: EngineBullet) {
    super(Assets.get('bullet'))
    this.engineBullet = engineBullet
    this.previousPosition = engineBullet.body.position
    this.scale.set(2)
    this.rotation = engineBullet.body.angle
    this.anchor.set(0.5)
    this.position.set(
      engineBullet.body.position.x,
      engineBullet.body.position.y
    )
  }

  init() {
    // noop
  }

  update() {
    const position = this.engineBullet.body.position
    this.rotation = this.engineBullet.body.angle
    this.position.set(
      lerp(this.position.x, position.x, 0.4),
      lerp(this.position.y, position.y, 0.4)
    )
  }
}

export default Bullet

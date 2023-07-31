import Matter from 'matter-js'
import * as PIXI from 'pixi.js'
import { Assets } from 'pixi.js'
import { Bullet as EngineBullet } from '@astroparty/engine'

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

  update(interpolation: number) {
    const position = this.engineBullet.body.position
    this.rotation = this.engineBullet.body.angle
    this.position.set(
      this.position.x + (position.x - this.position.x) * interpolation,
      this.position.y + (position.y - this.position.y) * interpolation
    )
  }
}

export default Bullet

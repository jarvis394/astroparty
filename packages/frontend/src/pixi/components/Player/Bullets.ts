import * as PIXI from 'pixi.js'
import { Player as EnginePlayer } from '@astroparty/engine'

class Bullets extends PIXI.Container {
  static BULLETS_ROTATE_ANGLE = 2
  enginePlayer: EnginePlayer
  bulletsCount: number

  constructor(enginePlayer: EnginePlayer) {
    super()
    this.enginePlayer = enginePlayer
    this.bulletsCount = enginePlayer.bullets
    this.drawBullets()
  }

  drawBullets() {
    for (let i = 0; i < EnginePlayer.BULLETS_AMOUNT; i++) {
      if (i >= this.bulletsCount) continue

      const bulletGraphic = new PIXI.Graphics()
      bulletGraphic.beginFill(0xffffff)
      bulletGraphic.drawRect(0, EnginePlayer.HITBOX_RADIUS * 2.5, 6, 6)
      bulletGraphic.endFill()
      bulletGraphic.angle = (360 / EnginePlayer.BULLETS_AMOUNT) * i
      this.addChild(bulletGraphic)
    }
  }

  init() {
    // noop
  }

  update(interpolation: number) {
    if (this.bulletsCount !== this.enginePlayer.bullets) {
      this.bulletsCount = this.enginePlayer.bullets
      this.removeChildren()
      this.drawBullets()
    }

    this.angle += Bullets.BULLETS_ROTATE_ANGLE * interpolation
  }
}

export default Bullets

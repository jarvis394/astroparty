import * as PIXI from 'pixi.js'
import EnginePlayer from 'src/engine/Player'

class Bullets extends PIXI.Container {
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

    this.angle += 2 * interpolation
  }
}

export default Bullets

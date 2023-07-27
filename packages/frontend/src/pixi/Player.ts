import * as PIXI from 'pixi.js'
import { Assets } from 'pixi.js'
import EnginePlayer from 'src/engine/Player'
import { degreesToRadian, lerp } from '@astroparty/shared/utils'

class Player extends PIXI.Sprite {
  private static SPRITE_ANGLE_CORRECTION = 90
  enginePlayer: EnginePlayer

  constructor(enginePlayer: EnginePlayer) {
    super(Assets.get('ship_blue'))
    this.enginePlayer = enginePlayer
    this.anchor.set(0.5)
    this.scale.set(4)
    this.position.set(
      enginePlayer.body.position.x,
      enginePlayer.body.position.y
    )
    this.rotation =
      enginePlayer.body.angle + degreesToRadian(Player.SPRITE_ANGLE_CORRECTION)

    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
  }

  onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowRight':
        this.enginePlayer.isRotating = true
        break
      case 'w':
        this.enginePlayer.dash()
        break
    }
  }
  onKeyUp(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowRight':
        this.enginePlayer.isRotating = false
        break
    }
  }

  init() {
    // noop
  }

  update() {
    const position = this.enginePlayer.body.position
    const angle = this.enginePlayer.body.angle
    const lerpPosition: Matter.Vector = {
      x: lerp(
        this.position.x,
        position.x,
        0.3 * this.enginePlayer.interpolation
      ),
      y: lerp(
        this.position.y,
        position.y,
        0.3 * this.enginePlayer.interpolation
      ),
    }

    this.position.set(lerpPosition.x, lerpPosition.y)
    this.rotation = lerp(
      this.rotation,
      angle + degreesToRadian(Player.SPRITE_ANGLE_CORRECTION),
      0.2 * this.enginePlayer.interpolation
    )
  }
}

export default Player

import * as PIXI from 'pixi.js'
import { Assets } from 'pixi.js'
import EnginePlayer, { AliveState } from 'src/engine/Player'
import { degreesToRadian, lerp } from '@astroparty/shared/utils'
import Matter from 'matter-js'

class Player extends PIXI.Container {
  private static SPRITE_ANGLE_CORRECTION = 90
  private static SPRITE_POSITION_CORRECTION = Matter.Vector.create(2, 0)
  enginePlayer: EnginePlayer
  sprite: PIXI.Sprite

  constructor(enginePlayer: EnginePlayer) {
    super()
    this.sprite = new PIXI.Sprite(Assets.get('ship_blue'))
    this.enginePlayer = enginePlayer
    this.scale.set(4)
    this.rotation = enginePlayer.body.angle
    this.sprite.anchor.set(0.5)
    this.sprite.position.set(
      Player.SPRITE_POSITION_CORRECTION.x,
      Player.SPRITE_POSITION_CORRECTION.y
    )
    this.sprite.rotation = degreesToRadian(Player.SPRITE_ANGLE_CORRECTION)

    this.addChild(this.sprite)
  }

  init() {
    // noop
  }

  update(interpolation: number) {
    const angle = this.enginePlayer.body.angle

    if (this.enginePlayer.aliveState === AliveState.CRAFT_DESTROYED) {
      this.scale.set(2)
    }

    if (this.enginePlayer.isDashing) {
      this.rotation = lerp(
        this.rotation,
        this.rotation + (angle - this.rotation) * interpolation,
        0.2
      )
    } else {
      this.rotation += (angle - this.rotation) * interpolation
    }
  }
}

export default Player

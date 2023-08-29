import * as PIXI from 'pixi.js'
import { Assets } from 'pixi.js'
import { Player as EnginePlayer, AliveState } from '@astroparty/engine'
import { degreesToRadian, lerp } from '@astroparty/shared/utils'
import Matter from 'matter-js'

class Player extends PIXI.Container {
  private static ALIVE_SCALE = 4
  private static CRAFT_DESTROYED_SCALE = 2
  private static SPRITE_ANGLE_CORRECTION = 90
  private static SPRITE_POSITION_CORRECTION = Matter.Vector.create(2, 0)
  enginePlayer: EnginePlayer
  sprite: PIXI.Sprite

  constructor(enginePlayer: EnginePlayer) {
    super()
    this.sprite = new PIXI.Sprite(Assets.get('ship_blue'))
    this.enginePlayer = enginePlayer
    this.scale.set(Player.ALIVE_SCALE)
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
    const nextAngle = this.rotation + (angle - this.rotation) * interpolation

    // Не уверен, что на каждом тике применять scale это хорошая идея, но и проблем не заметил
    if (this.enginePlayer.aliveState === AliveState.CRAFT_DESTROYED) {
      this.scale.set(Player.CRAFT_DESTROYED_SCALE)
    }

    if (this.enginePlayer.aliveState === AliveState.ALIVE) {
      this.scale.set(Player.ALIVE_SCALE)
    }

    if (this.enginePlayer.isDashing) {
      this.rotation = lerp(this.rotation, nextAngle, 0.2)
    } else if (Math.abs(angle - this.rotation) > degreesToRadian(90)) {
      // Update angle instantly if rotation is too big
      this.rotation = angle
    } else {
      this.rotation = lerp(this.rotation, nextAngle, 0.3)
    }
  }
}

export default Player

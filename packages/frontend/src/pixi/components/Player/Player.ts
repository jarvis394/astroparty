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
    this.sprite = new PIXI.Sprite(Assets.get(enginePlayer.shipSprite))
    this.enginePlayer = enginePlayer
    this.rotation = enginePlayer.body.angle
    this.sprite.anchor.set(0.5)
    this.sprite.position.set(
      Player.SPRITE_POSITION_CORRECTION.x,
      Player.SPRITE_POSITION_CORRECTION.y
    )
    this.sprite.rotation = degreesToRadian(Player.SPRITE_ANGLE_CORRECTION)
    this.processAliveState()

    this.addChild(this.sprite)
  }

  init() {
    // noop
  }

  processAliveState() {
    switch (this.enginePlayer.aliveState) {
      case AliveState.ALIVE: {
        this.scale.set(Player.ALIVE_SCALE)
        break
      }
      case AliveState.CRAFT_DESTROYED: {
        this.scale.set(Player.CRAFT_DESTROYED_SCALE)
        break
      }
      case AliveState.DEAD: {
        // TODO: impl dead state
        break
      }
    }
  }

  update(interpolation: number) {
    const engineAngle = this.enginePlayer.body.angle
    const nextAngle =
      this.rotation + (engineAngle - this.rotation) * interpolation

    if (this.enginePlayer.isDashing) {
      this.rotation = lerp(this.rotation, nextAngle, 0.2)
    } else if (Math.abs(engineAngle - this.rotation) > degreesToRadian(90)) {
      // Update angle instantly if rotation is too big
      this.rotation = engineAngle
    } else {
      this.rotation = lerp(this.rotation, nextAngle, 0.3)
    }

    this.processAliveState()
  }
}

export default Player

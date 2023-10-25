import * as PIXI from 'pixi.js'
import { Player as EnginePlayer } from '@astroparty/engine'
import Bullets from './Bullets'
import Player from './Player'
import { lerp } from '@astroparty/shared/utils'

class PlayerContainer extends PIXI.Container {
  enginePlayer: EnginePlayer
  player: Player
  bullets: Bullets

  constructor(enginePlayer: EnginePlayer) {
    super()
    this.enginePlayer = enginePlayer
    this.bullets = new Bullets(enginePlayer)
    this.player = new Player(enginePlayer)
    this.position.set(
      enginePlayer.body.position.x,
      enginePlayer.body.position.y
    )

    this.addChild(this.player)
    this.addChild(this.bullets)
  }

  init() {
    // noop
  }

  update(interpolation: number) {
    const position = this.enginePlayer.body.position

    this.position.set(
      lerp(this.position.x, position.x, 0.4),
      lerp(this.position.y, position.y, 0.4)
    )

    this.player.update()
    this.bullets.update(interpolation)
  }
}

export default PlayerContainer

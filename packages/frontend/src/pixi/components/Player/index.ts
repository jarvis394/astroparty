import * as PIXI from 'pixi.js'
import EnginePlayer from 'src/engine/Player'
import Bullets from './Bullets'
import Player from './Player'

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

    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
  }

  onKeyDown(e: KeyboardEvent) {
    if (!this.enginePlayer.isMe) return

    switch (e.code) {
      case 'ArrowRight':
        this.enginePlayer.isRotating = true
        break
      case 'KeyW':
        this.enginePlayer.dash()
        break
      case 'Space':
        this.enginePlayer.shoot()
        break
    }
  }

  onKeyUp(e: KeyboardEvent) {
    if (!this.enginePlayer.isMe) return

    switch (e.key) {
      case 'ArrowRight':
        this.enginePlayer.isRotating = false
        break
    }
  }

  init() {
    // noop
  }

  update(interpolation: number) {
    const position = this.enginePlayer.body.position

    this.position.set(
      this.position.x + (position.x - this.position.x) * interpolation,
      this.position.y + (position.y - this.position.y) * interpolation
    )

    this.player.update(interpolation)
    this.bullets.update(interpolation)
  }
}

export default PlayerContainer

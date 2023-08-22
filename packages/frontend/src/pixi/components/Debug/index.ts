import * as PIXI from 'pixi.js'
import { World } from '@astroparty/engine'
import { ClientEngine } from 'src/models/ClientEngine'

class Debug extends PIXI.Container {
  clientEngine: ClientEngine

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine
  }

  init() {
    // noop
  }

  update() {
    let i = 0
    let height = 0
    this.removeChildren()

    this.clientEngine.engine.game.world.players.forEach((player) => {
      const playerPosition = new PIXI.Text(
        `id: ${player.id}\nx: ${player.body.position.x}\ny: ${player.body.position.y}\nangle: ${player.angle}\naliveState: ${player.aliveState}\nbullets: ${player.bullets}`,
        new PIXI.TextStyle({
          fill: 0xffffff,
          fontSize: 16,
          fontFamily: 'Roboto',
        })
      )
      height = playerPosition.height
      playerPosition.position.set(
        16 + i * 220,
        World.WORLD_HEIGHT - height - 12
      )
      this.addChild(playerPosition)
      i++
    })

    const keysPressed: string[] = []
    this.clientEngine.keysPressed.forEach((keyCode) =>
      keysPressed.push(keyCode)
    )
    const keysPressedText = new PIXI.Text(
      `keys pressed:\n${keysPressed.join(', ')}`,
      new PIXI.TextStyle({
        fill: 0xffffff,
        fontSize: 16,
        fontFamily: 'Roboto',
      })
    )
    keysPressedText.position.set(16, World.WORLD_HEIGHT + 50 + 12)
    this.addChild(keysPressedText)
  }
}

export default Debug

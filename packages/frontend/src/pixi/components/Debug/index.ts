import * as PIXI from 'pixi.js'
import { Player, World } from '@astroparty/engine'
import { ClientEngine } from 'src/models/ClientEngine'

class PlayerDebug extends PIXI.Container {
  enginePlayer: Player
  text: PIXI.Text

  constructor(enginePlayer: Player, index: number) {
    super()
    this.enginePlayer = enginePlayer

    this.text = new PIXI.Text(this.getText(), {
      fontFamily: 'Roboto',
      fill: '#ffffff',
      fontSize: 16,
    })
    this.position.set(
      16 + (this.text.width + 32) * index,
      World.WORLD_HEIGHT - this.text.height - 12
    )
    this.addChild(this.text)
  }

  getText() {
    const lines = [
      `id: ${this.enginePlayer.id}`,
      `x: ${this.enginePlayer.body.position.x}`,
      `y: ${this.enginePlayer.body.position.y}`,
      `angle: ${this.enginePlayer.angle.toFixed(3)}`,
      `aliveState: ${this.enginePlayer.aliveState}`,
      `bullets: ${this.enginePlayer.bullets}`,
      `isServerControlled: ${this.enginePlayer.isServerControlled}`,
    ]

    return lines.join('\n')
  }

  update() {
    this.text.text = this.getText()
  }
}

class KeysPressedDebug extends PIXI.Container {
  clientEngine: ClientEngine
  text: PIXI.Text

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine

    this.text = new PIXI.Text(this.getText(), {
      fontFamily: 'Roboto',
      fill: '#ffffff',
      fontSize: 16,
    })
    this.position.set(16, World.WORLD_HEIGHT + 50 + 12)
    this.addChild(this.text)
  }

  getText() {
    const keysPressed: string[] = []
    this.clientEngine.keysPressed.forEach((keyCode) =>
      keysPressed.push(keyCode)
    )

    return `keys pressed:\n${keysPressed.join(', ')}`
  }

  update() {
    this.text.text = this.getText()
  }
}

class Debug extends PIXI.Container {
  clientEngine: ClientEngine
  playersDebug: Map<Player['id'], PlayerDebug>
  keysPressedDebug: KeysPressedDebug

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine
    this.playersDebug = new Map()
    this.keysPressedDebug = new KeysPressedDebug(clientEngine)

    for (const enginePlayer of clientEngine.engine.game.world.getAllPlayersIterator()) {
      const component = new PlayerDebug(enginePlayer, this.playersDebug.size)
      this.playersDebug.set(enginePlayer.id, component)
      this.addChild(component)
    }

    this.addChild(this.keysPressedDebug)
  }

  update() {
    for (const enginePlayer of this.clientEngine.engine.game.world.getAllPlayersIterator()) {
      if (!this.playersDebug.has(enginePlayer.id)) {
        const component = new PlayerDebug(enginePlayer, this.playersDebug.size)
        this.playersDebug.set(enginePlayer.id, component)
        this.addChild(component)
      }
    }

    this.playersDebug.forEach((component) => {
      component.update()
    })

    this.keysPressedDebug.update()
  }
}

export default Debug

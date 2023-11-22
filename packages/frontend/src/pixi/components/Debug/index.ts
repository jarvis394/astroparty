import * as PIXI from 'pixi.js'
import { Player, World } from '@astroparty/engine'
import { ClientEngine } from 'src/models/ClientEngine'
import PixiPlayer from '../Player/Player'
import { Snapshot } from '@astroparty/shared/game/Snapshot'
import { ShipSprite } from '@astroparty/shared/types/ShipSprite'
import Matter from 'matter-js'
import { degreesToRadian, lerp } from '@astroparty/shared/utils'
import Viewport from 'src/pixi/scenes/Main/Viewport'

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
      `speed: ${this.enginePlayer.body.speed}`,
      `angularSpeed: ${this.enginePlayer.body.angularSpeed}`,
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

class PingDebug extends PIXI.Container {
  clientEngine: ClientEngine
  text: PIXI.Text

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine

    this.text = new PIXI.Text(this.getText(), {
      fontFamily: 'Roboto',
      fill: '#ffffff',
      fontSize: 16,
      align: 'right',
    })
    this.position.set(
      window.innerWidth - 16 - this.text.width,
      window.innerHeight - 16 - this.text.height
    )
    this.addChild(this.text)
  }

  getText() {
    return `ping: ${this.clientEngine.timeOffset}`
  }

  update() {
    this.text.text = this.getText()
  }
}

class PlayerModelDebug extends PIXI.Container {
  clientEngine: ClientEngine
  player: PixiPlayer
  enginePlayer: Player

  constructor(clientEngine: ClientEngine) {
    super()
    this.clientEngine = clientEngine

    this.enginePlayer = new Player({
      id: 'debug_player',
      position: { x: 0, y: 0 },
      shipSprite: ShipSprite.BLUE,
      world: this.clientEngine.engine.game.world,
    })

    this.player = new PixiPlayer(this.enginePlayer)
    this.alpha = 0.24
    this.addChild(this.player)
  }

  update() {
    const latestSnapshot = this.clientEngine.snapshots.vault.get() as
      | Snapshot
      | undefined
    const snapshotPlayer = latestSnapshot?.state.players.find(
      (player) => player.id === this.clientEngine.playerId
    )

    if (!snapshotPlayer) return

    this.enginePlayer.aliveState = snapshotPlayer.aliveState

    Matter.Body.setPosition(
      this.enginePlayer.body,
      Matter.Vector.create(snapshotPlayer.positionX, snapshotPlayer.positionY)
    )
    Matter.Body.setVelocity(
      this.enginePlayer.body,
      Matter.Vector.create(snapshotPlayer.velocityX, snapshotPlayer.velocityY)
    )
    Matter.Body.setAngle(
      this.enginePlayer.body,
      degreesToRadian(snapshotPlayer.angle)
    )
    Matter.Body.setAngularVelocity(this.enginePlayer.body, 0)
    this.enginePlayer.angle = snapshotPlayer.angle
    const position = this.enginePlayer.body.position

    this.position.set(
      lerp(this.position.x, position.x, 0.3),
      lerp(this.position.y, position.y, 0.3)
    )

    this.player.update()
  }
}

class Debug extends PIXI.Container {
  viewport: Viewport
  clientEngine: ClientEngine
  playersDebug: Map<Player['id'], PlayerDebug>
  keysPressedDebug: KeysPressedDebug
  pingDebug: PingDebug
  playerModelDebug: PlayerModelDebug

  constructor(clientEngine: ClientEngine, viewport: Viewport) {
    super()
    this.clientEngine = clientEngine
    this.viewport = viewport
    this.playersDebug = new Map()
    this.keysPressedDebug = new KeysPressedDebug(clientEngine)
    this.pingDebug = new PingDebug(clientEngine)
    this.playerModelDebug = new PlayerModelDebug(clientEngine)

    for (const enginePlayer of clientEngine.engine.game.world.getAllPlayersIterator()) {
      const component = new PlayerDebug(enginePlayer, this.playersDebug.size)
      this.playersDebug.set(enginePlayer.id, component)
      this.addChild(component)
    }

    this.addChild(this.keysPressedDebug)
    this.addChild(this.pingDebug)
    this.viewport.addChild(this.playerModelDebug)
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
    this.pingDebug.update()
    this.playerModelDebug.update()
  }
}

export default Debug

import { Engine, World } from '@astroparty/engine'
import { lerp } from '@astroparty/shared/utils'
import Matter from 'matter-js'
import { Viewport as PixiViewport } from 'pixi-viewport'
import { DisplayObject } from 'pixi.js'
import { MATTER_CANVAS_CONTAINER_ID } from 'src/components/App'
import Application from 'src/pixi/Application'

class Viewport {
  app: Application
  engine: Engine
  root: PixiViewport
  viewportPosition: Matter.Vector
  viewportScale: number
  matterRender?: Matter.Render
  bounds: Matter.Bounds

  constructor(app: Application, engine: Engine) {
    this.app = app
    this.engine = engine

    // Resize viewport on pixi app resize
    this.app.renderer.addListener('resize', (w: number, h: number) => {
      const { scale } = this.getViewportDimensions()
      this.root.resize(w, h)
      this.root.setZoom(scale, true)
    })

    const { x, y, scale } = this.getViewportDimensions()
    this.viewportPosition = { x, y }
    this.viewportScale = scale
    this.root = new PixiViewport({
      events: app.renderer.events,
      worldHeight: World.WORLD_HEIGHT,
      worldWidth: World.WORLD_WIDTH,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    })
    this.bounds = Matter.Bounds.create([
      { x: 0, y: 0 },
      { x: window.innerWidth, y: 0 },
      { x: window.innerWidth, y: window.innerHeight },
      { x: 0, y: window.innerHeight },
    ])

    const canvas = document.getElementById(MATTER_CANVAS_CONTAINER_ID)

    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return

    this.matterRender = Matter.Render.create({
      engine: this.engine.matterEngine,
      canvas: canvas,
      bounds: this.bounds,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: 'transparent',
        wireframeBackground: 'transparent',
        wireframes: true,
        showStats: true,
        showAngleIndicator: true,
        showBounds: true,
        showDebug: true,
        showVelocity: true,
      },
    })

    this.translateMatterRender()
    Matter.Render.run(this.matterRender)
  }

  translateMatterRender() {
    const scale = this.viewportScale

    if (!this.matterRender) return

    this.bounds = Matter.Bounds.create([
      { x: 0, y: 0 },
      {
        x: window.innerWidth / scale,
        y: 0,
      },
      {
        x: window.innerWidth / scale,
        y: window.innerHeight / scale,
      },
      {
        x: 0,
        y: window.innerHeight / scale,
      },
    ])

    Matter.Bounds.translate(this.bounds, {
      x: -this.root.position.x / scale,
      y: -this.root.position.y / scale,
    })

    this.matterRender.bounds = this.bounds
  }

  init() {
    this.root.moveCenter(World.WORLD_WIDTH / 2, World.WORLD_HEIGHT / 2)
    this.root.fit(true)
  }

  fit() {
    const { x, y, scale } = this.getViewportDimensions()

    this.viewportPosition = {
      x: lerp(this.viewportPosition.x, x, 0.02),
      y: lerp(this.viewportPosition.y, y, 0.02),
    }
    this.viewportScale = lerp(this.viewportScale, scale, 0.02)

    this.root.animate({
      time: 0,
      position: this.viewportPosition,
      scale: this.viewportScale,
      ease: 'linear',
      removeOnInterrupt: false,
    })

    this.translateMatterRender()
  }

  getViewportDimensions() {
    const viewportPadding = 64

    const minScale = Math.min(
      window.innerWidth / (World.WORLD_WIDTH + viewportPadding),
      window.innerHeight / (World.WORLD_HEIGHT + viewportPadding)
    )
    const maxScale = Math.min(
      (window.innerWidth / (World.WORLD_WIDTH + viewportPadding)) * 2,
      (window.innerHeight / (World.WORLD_HEIGHT + viewportPadding)) * 2
    )

    const min: Matter.Vector = {
      x: World.WORLD_WIDTH * 2,
      y: World.WORLD_HEIGHT * 2,
    }
    const max: Matter.Vector = { x: 0, y: 0 }

    this.engine.game.world.players.forEach((player) => {
      const { x, y } = player.body.position

      min.x = Math.max(
        Math.min(x - viewportPadding, min.x),
        -World.WORLD_WIDTH * 2
      )
      min.y = Math.max(
        Math.min(y - viewportPadding, min.y),
        -World.WORLD_WIDTH * 2
      )
      max.x = Math.min(
        Math.max(x + viewportPadding, max.x),
        World.WORLD_WIDTH * 2
      )
      max.y = Math.min(
        Math.max(y + viewportPadding, max.y),
        World.WORLD_WIDTH * 2
      )
    })

    let x = (max.x - min.x) / 2 + min.x
    let y = (max.y - min.y) / 2 + min.y
    let scale = Math.min(
      window.innerWidth / (max.x - min.x + viewportPadding * 2),
      window.innerHeight / (max.y - min.y + viewportPadding * 2)
    )

    if (this.engine.game.world.players.size === 1) {
      scale = 1
    }

    if (this.engine.game.world.players.size === 0) {
      x = World.WORLD_WIDTH / 2
      y = World.WORLD_HEIGHT / 2
      scale = 1
    }

    if (scale < minScale) {
      scale = minScale
    }

    if (scale > maxScale) {
      scale = maxScale
    }

    return { x, y, scale, min, max, minScale, maxScale, viewportPadding }
  }

  get children() {
    return this.root.children
  }

  addChild(...children: DisplayObject[]) {
    this.root.addChild(...children)
  }

  removeChild(...children: DisplayObject[]) {
    this.root.removeChild(...children)
  }
}

export default Viewport

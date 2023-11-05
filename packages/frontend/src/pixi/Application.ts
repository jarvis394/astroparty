import * as PIXI from 'pixi.js'

PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST

export default class Application extends PIXI.Application<HTMLCanvasElement> {
  constructor(
    element?: HTMLDivElement | null,
    props?: PIXI.IApplicationOptions
  ) {
    super({
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: window.devicePixelRatio || 1,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resizeTo: window,
      ...props,
    })

    if (!element) {
      throw new Error('No element for canvas provided')
    }

    this.stage.sortableChildren = true
    element.appendChild(this.view)

    this.view.style.position = 'fixed'
    this.view.style.display = 'block'
    this.view.style.left = '0px'
    this.view.style.top = '0px'
    this.view.style.height = '100%'
    this.view.style.width = '100%'
    this.view.style.zIndex = '0'
  }
}

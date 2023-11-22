import React, { useRef } from 'react'
import { Engine } from '@astroparty/engine'
import Application from 'src/pixi/Application'
import ScenesController from 'src/pixi/ScenesController'
import { SCENES } from 'src/pixi/scenes'
import { loadAssets } from 'src/assets'
import useMountEffect from 'src/hooks/useMountEffect'

export const PIXI_CANVAS_CONTAINER_ID = 'pixi-container'
export const MATTER_CANVAS_CONTAINER_ID = 'matter-container'

const App: React.FC = () => {
  const canvasContainer = useRef<HTMLDivElement>(null)
  const engine = useRef(new Engine())

  useMountEffect(() => {
    const app = new Application(canvasContainer.current)
    const scenesController = new ScenesController(app, engine.current)

    const start = async () => {
      await loadAssets()
      await scenesController.loadScene(SCENES.MainScene)
    }

    start()

    return () => {
      engine.current.destroy()
      app.destroy()
    }
  })

  return (
    <>
      <button
        onClick={() => {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen()
          }
        }}
        style={{ position: 'absolute', zIndex: 100, top: 8, right: 8 }}
      >
        Fullscreen
      </button>
      <div id={PIXI_CANVAS_CONTAINER_ID} ref={canvasContainer} />
      <canvas
        id={MATTER_CANVAS_CONTAINER_ID}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
        }}
      />
    </>
  )
}

export default App

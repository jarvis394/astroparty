import { Assets } from 'pixi.js'
import React, { useRef } from 'react'
import Engine from 'src/engine/Engine'
import Application from 'src/pixi/Application'
import ScenesController from 'src/pixi/ScenesController'
import { SCENES } from 'src/pixi/scenes'
import shipBlueSprite from 'src/assets/ship.png'
import bulletSprite from 'src/assets/bullet.png'
import Matter from 'matter-js'
import useScreenDimensions from 'src/hooks/useScreenDimensions'
import useMountEffect from 'src/hooks/useMountEffect'

const PIXI_CANVAS_CONTAINER_ID = 'pixi-container'

const App: React.FC = () => {
  const screenDimensions = useScreenDimensions()
  const canvasContainer = useRef<HTMLDivElement>(null)
  const engine = useRef(new Engine())
  const render = React.useMemo(
    () =>
      Matter.Render.create({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        element: document.getElementById('matterjs-root')!,
        engine: engine.current.matterEngine,
        options: {
          width: screenDimensions.width,
          height: screenDimensions.height,
          background: 'transparent',
          wireframeBackground: 'transparent',
          wireframes: true,
          showStats: true,
          showAngleIndicator: true,
          showBounds: true,
          showDebug: true,
          showVelocity: true,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useMountEffect(() => {
    const app = new Application(canvasContainer.current)
    const scenesController = new ScenesController(app, engine.current)

    const start = async () => {
      Matter.Render.run(render)
      Assets.add('ship_blue', shipBlueSprite)
      Assets.add('bullet', bulletSprite)
      await Assets.load(['ship_blue', 'bullet'])
      const me = engine.current.addPlayer()
      engine.current.game.setMe(me)
      engine.current.addPlayer()
      engine.current.start()
      scenesController.loadScene(SCENES.MainScene)
    }

    start()

    return () => {
      // Ссылка на движок никогда изменится
      // eslint-disable-next-line react-hooks/exhaustive-deps
      engine.current.destroy()
      app.destroy()
    }
  })

  return <div id={PIXI_CANVAS_CONTAINER_ID} ref={canvasContainer} />
}

export default App

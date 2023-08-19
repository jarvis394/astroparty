import { Assets } from 'pixi.js'
import React, { useRef } from 'react'
import { Engine } from '@astroparty/engine'
import Application from 'src/pixi/Application'
import ScenesController from 'src/pixi/ScenesController'
import { SCENES } from 'src/pixi/scenes'
import shipBlueSprite from 'src/assets/ship.png'
import bulletSprite from 'src/assets/bullet.png'
import useMountEffect from 'src/hooks/useMountEffect'
import MatterRender from '../MatterRender'

const PIXI_CANVAS_CONTAINER_ID = 'pixi-container'

const App: React.FC = () => {
  const canvasContainer = useRef<HTMLDivElement>(null)
  const engine = useRef(new Engine())

  useMountEffect(() => {
    const app = new Application(canvasContainer.current)
    const scenesController = new ScenesController(app, engine.current)

    const start = async () => {
      Assets.add('ship_blue', shipBlueSprite)
      Assets.add('bullet', bulletSprite)
      await Assets.load(['ship_blue', 'bullet'])
      await scenesController.loadScene(SCENES.MainScene)
    }

    start()

    return () => {
      // Ссылка на движок никогда изменится
      // eslint-disable-next-line react-hooks/exhaustive-deps
      engine.current.destroy()
      app.destroy()
    }
  })

  return (
    <>
      <div id={PIXI_CANVAS_CONTAINER_ID} ref={canvasContainer} />
      <MatterRender engine={engine.current.matterEngine} />
    </>
  )
}

export default App

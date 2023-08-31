import React, { useRef } from 'react'
import { Engine } from '@astroparty/engine'
import Application from 'src/pixi/Application'
import ScenesController from 'src/pixi/ScenesController'
import { SCENES } from 'src/pixi/scenes'
import { loadAssets } from 'src/assets'
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
      await loadAssets()
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

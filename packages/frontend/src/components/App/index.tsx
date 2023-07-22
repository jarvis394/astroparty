import React, { useEffect, useState } from 'react'
import { Engine, Events, Render, Runner, World } from 'matter-js'
import { useMatter } from 'src/components/MatterEngine'
import Ship from '../Ship'
import useScreenDimensions from 'src/hooks/useScreenDimensions'
import { useApp } from '@pixi/react'
import Walls from '../Walls'

const App: React.FC = () => {
  const app = useApp()
  const screenDimensions = useScreenDimensions()
  const { engine, runner } = useMatter()
  const [, update] = useState(0)
  const render = React.useMemo(
    () =>
      Render.create({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        element: document.getElementById('matterjs-root')!,
        engine: engine,
        options: {
          width: screenDimensions.width,
          height: screenDimensions.height,
          background: 'transparent',
          wireframeBackground: 'transparent',
          showStats: true,
          showAngleIndicator: true,
          showBounds: true,
          showDebug: true,
          showVelocity: true,
        },
      }),
    [engine, screenDimensions.height, screenDimensions.width]
  )

  useEffect(() => {
    Runner.run(runner, engine)

    Events.on(runner, 'tick', () => {
      update((prev) => (prev + 1) % 2)
    })

    Render.run(render)
    app.start()

    return () => {
      World.clear(engine.world, false)
      Engine.clear(engine)
      Runner.stop(runner)
      render.canvas.remove()
    }
  }, [
    app,
    engine,
    render,
    runner,
    screenDimensions.height,
    screenDimensions.width,
  ])

  return (
    <>
      <Walls />
      <Ship />
    </>
  )
}

export default App

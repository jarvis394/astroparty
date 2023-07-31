import Matter from 'matter-js'
import React, { useEffect, useRef } from 'react'
import useScreenDimensions from 'src/hooks/useScreenDimensions'

type MatterRenderProps = {
  engine: Matter.Engine
}

const MatterRender: React.FC<MatterRenderProps> = ({ engine }) => {
  const screenDimensions = useScreenDimensions()
  const $root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const render = Matter.Render.create({
      element: $root.current || undefined,
      engine,
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
    })

    Matter.Render.run(render)

    return () => {
      Matter.Render.stop(render)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={$root}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}
    />
  )
}

export default MatterRender

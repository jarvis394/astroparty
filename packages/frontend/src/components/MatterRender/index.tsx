import { World } from '@astroparty/engine'
import Matter from 'matter-js'
import React, { useEffect, useRef } from 'react'
import useScreenDimensions from 'src/hooks/useScreenDimensions'

type MatterRenderProps = {
  render: Matter.Render
}

const MatterRender: React.FC<MatterRenderProps> = ({ render }) => {
  const screenDimensions = useScreenDimensions()
  const $root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bounds = Matter.Bounds.create([
      { x: 0, y: 0 },
      { x: window.innerWidth, y: 0 },
      { x: window.innerWidth, y: window.innerHeight },
      { x: 0, y: window.innerHeight },
    ])

    Matter.Bounds.translate(bounds, {
      x: -window.innerWidth / 2 + World.WORLD_WIDTH / 2,
      y: -window.innerHeight / 2 + World.WORLD_HEIGHT / 2,
    })

    if ($root.current) {
      render.element = $root.current
    }

    render.bounds = bounds
    render.options = {
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
    }

    Matter.Render.run(render)
    console.log('run', $root.current)
    // Matter.Render.setPixelRatio(render, window.devicePixelRatio)

    // return () => {
    //   Matter.Render.stop(render)
    // }
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

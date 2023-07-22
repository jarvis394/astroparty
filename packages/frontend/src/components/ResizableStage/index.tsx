import React from 'react'
import { Stage } from '@pixi/react'
import useScreenDimensions from 'src/hooks/useScreenDimensions'
import * as PIXI from 'pixi.js'

PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST

const ResizableStage: React.FC<React.PropsWithChildren> = ({ children }) => {
  const screenDimensions = useScreenDimensions()

  return (
    <Stage
      width={screenDimensions.width}
      height={screenDimensions.height}
      options={{
        backgroundAlpha: 0,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x000000,
      }}
      raf={false}
      renderOnComponentChange={true}
    >
      {children}
    </Stage>
  )
}

export default ResizableStage

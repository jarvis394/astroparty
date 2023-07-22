import React from 'react'
import { Application as PixiApplication } from '@pixi/app'
import { PixiComponent, useApp } from '@pixi/react'
import { IViewportOptions, Viewport } from 'pixi-viewport'

type PixiViewportComponentProps = {
  app: PixiApplication
} & Partial<IViewportOptions>
type PixiViewportProps = React.PropsWithChildren<
  Omit<PixiViewportComponentProps, 'app'>
>

const PixiViewportComponent = PixiComponent('Viewport', {
  create: (props: PixiViewportComponentProps) => {
    const { app, ...viewportOptions } = props
    const { ticker } = app
    const { events } = app.renderer

    const viewport = new Viewport({
      ...viewportOptions,
      ticker: ticker,
      events: events,
    })

    viewport
      .drag()
      .pinch()
      .wheel({ smooth: 10 })
      .clamp({ direction: 'all' })
      .clampZoom({ minScale: 1, maxScale: 3 })
      .decelerate({
        friction: 0.9, // percent to decelerate after movement
      })

    if (props.worldWidth && props.worldHeight) {
      viewport.moveCenter(props.worldWidth / 2, props.worldHeight / 2)
    }

    return viewport
  },
})

const PixiViewport = React.forwardRef<Viewport, PixiViewportProps>(
  (props, ref) => <PixiViewportComponent {...props} ref={ref} app={useApp()} />,
)
PixiViewport.displayName = 'PixiViewport'

export default PixiViewport

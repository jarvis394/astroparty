import { Sprite, useApp } from '@pixi/react'
import { Bodies, Body, Events, World, Vector } from 'matter-js'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useMatter } from '../MatterEngine'
import shipImage from 'src/assets/ship.png'
import useMountEffect from 'src/hooks/useMountEffect'

const HITBOX_RADIUS = 24
const SHIP_SPEED = 24

const getAngleVector = (body: Body) => {
  return Vector.rotate(Vector.create(1, 1), body.angle - (Math.PI / 180) * 45)
}

const Ship: React.FC = () => {
  const app = useApp()
  const { engine, runner } = useMatter()
  const body = useRef(
    Bodies.circle(app.screen.width / 2, app.screen.height / 2, HITBOX_RADIUS, {
      friction: 0,
      angularVelocity: 0,
    })
  )
  const [isRotating, setIsRotating] = useState(false)

  const dash = () => {
    Body.setAngle(body.current, body.current.angle + (Math.PI / 180) * 90)
    Body.setVelocity(
      body.current,
      Vector.mult(getAngleVector(body.current), SHIP_SPEED * 20)
    )
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        setIsRotating(true)
        break
      case 'w':
        dash()
        break
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        setIsRotating(false)
        break
    }
  }, [])

  const update = useCallback(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    (event) => {
      const timeScale = (event.source.delta || 1000 / 60) / 1000
      console.log(engine.timing)
      Body.setVelocity(
        body.current,
        Vector.mult(getAngleVector(body.current), timeScale * SHIP_SPEED)
      )
      // Body.setAngularVelocity(body.current, 0)
      isRotating && Body.rotate(body.current, (Math.PI / 180) * 1.5)
    },
    [isRotating]
  )

  useMountEffect(() => {
    World.addBody(engine.world, body.current)
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    Events.on(runner, 'tick', update)

    return () => {
      Events.off(runner, 'tick', update)

      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp, runner, update])

  return (
    <Sprite
      scale={4}
      anchor={[0.5, 0.5]}
      position={body.current.position}
      image={shipImage}
      rotation={body.current.angle + Math.PI / 2}
    />
  )
}

export default Ship

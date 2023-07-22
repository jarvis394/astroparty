import { useApp } from '@pixi/react'
import { Bodies, IChamferableBodyDefinition, World } from 'matter-js'
import React, { useEffect } from 'react'
import { useMatter } from '../MatterEngine'

const Walls: React.FC = () => {
  const app = useApp()
  const { engine } = useMatter()

  useEffect(() => {
    const sw = app.screen.width
    const sh = app.screen.height
    const wallOptions: IChamferableBodyDefinition = {
      isStatic: true,
      friction: 0,
      restitution: 0,
      mass: 0,
    }

    World.add(engine.world, [
      Bodies.rectangle(sw / 2, -10, sw, 20, wallOptions),
      Bodies.rectangle(-10, sh / 2, 20, sh, wallOptions),
      Bodies.rectangle(sw / 2, sh + 10, sw, 20, wallOptions),
      Bodies.rectangle(sw + 10, sh / 2, 20, sh, wallOptions),
    ])
  }, [app.screen.height, app.screen.width, engine.world])

  return null
}

export default Walls

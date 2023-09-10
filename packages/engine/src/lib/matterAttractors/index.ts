import Matter from 'matter-js'

interface Attractors extends Matter.Plugin {
  Body: {
    init: (body: Matter.Body) => void
  }
  Engine: {
    update: (engine: Matter.Engine) => void
  }
  Attractors: {
    gravityConstant: number
    gravity: (bodyA: Matter.Body, bodyB: Matter.Body) => void
  }
}

/**
 * An attractors plugin for matter.js.
 * See the readme for usage and examples.
 * @module MatterAttractors
 */
const MatterAttractors: Attractors = {
  name: 'matter-attractors',
  version: '0.1.7',
  for: 'matter-js@^0.19.0',

  // installs the plugin where `base` is `Matter`
  // you should not need to call this directly.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  install: (base) => {
    base.after('Body.create', (body: Matter.Body) => {
      MatterAttractors.Body.init(body)
    })

    base.before('Engine.update', (engine: Matter.Engine) => {
      MatterAttractors.Engine.update(engine)
    })
  },

  Body: {
    /**
     * Initialises the `body` to support attractors.
     * This is called automatically by the plugin.
     * @function MatterAttractors.Body.init
     * @param {Matter.Body} body The body to init.
     * @returns {void} No return value.
     */
    init: (body: Matter.Body): void => {
      if (!body.plugin) {
        body.plugin = {}
      }

      body.plugin.attractors = body.plugin?.attractors || []
    },
  },

  Engine: {
    /**
     * Applies all attractors for all bodies in the `engine`.
     * This is called automatically by the plugin.
     * @function MatterAttractors.Engine.update
     * @param {Matter.Engine} engine The engine to update.
     * @returns {void} No return value.
     */
    update: (engine: Matter.Engine): void => {
      const world = engine.world,
        bodies = Matter.Composite.allBodies(world)

      for (let i = 0; i < bodies.length; i += 1) {
        const bodyA = bodies[i],
          attractors = bodyA.plugin.attractors

        if (attractors && attractors.length > 0) {
          for (let j = i + 1; j < bodies.length; j += 1) {
            const bodyB = bodies[j]

            for (let k = 0; k < attractors.length; k += 1) {
              const attractor = attractors[k]
              let forceVector = attractor

              if (Matter.Common.isFunction(attractor)) {
                forceVector = attractor(bodyA, bodyB)
              }

              if (forceVector) {
                Matter.Body.applyForce(bodyB, bodyB.position, forceVector)
              }
            }
          }
        }
      }
    },
  },

  /**
   * Defines some useful common attractor functions that can be used
   * by pushing them to your body's `body.plugin.attractors` array.
   * @namespace MatterAttractors.Attractors
   * @property {number} gravityConstant The gravitational constant used by the gravity attractor.
   */
  Attractors: {
    gravityConstant: 0.001,

    /**
     * An attractor function that applies Newton's law of gravitation.
     * Use this by pushing `MatterAttractors.Attractors.gravity` to your body's `body.plugin.attractors` array.
     * The gravitational constant defaults to `0.001` which you can change
     * at `MatterAttractors.Attractors.gravityConstant`.
     * @function MatterAttractors.Attractors.gravity
     * @param {Matter.Body} bodyA The first body.
     * @param {Matter.Body} bodyB The second body.
     * @returns {void} No return value.
     */
    gravity: (bodyA: Matter.Body, bodyB: Matter.Body): void => {
      // use Newton's law of gravitation
      const bToA = Matter.Vector.sub(bodyB.position, bodyA.position),
        distanceSq = Matter.Vector.magnitudeSquared(bToA) || 0.0001,
        normal = Matter.Vector.normalise(bToA),
        magnitude =
          -MatterAttractors.Attractors.gravityConstant *
          ((bodyA.mass * bodyB.mass) / distanceSq),
        force = Matter.Vector.mult(normal, magnitude)

      // to apply forces to both bodies
      Matter.Body.applyForce(bodyA, bodyA.position, Matter.Vector.neg(force))
      Matter.Body.applyForce(bodyB, bodyB.position, force)
    },
  },
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
Matter.Plugin.register(MatterAttractors)

/**
 * @namespace Matter.Body
 * @see http://brm.io/matter-js/docs/classes/Body.html
 */

/**
 * This plugin adds a new property `body.plugin.attractors` to instances of `Matter.Body`.
 * This is an array of callback functions that will be called automatically
 * for every pair of bodies, on every engine update.
 * @property {Function[]} body.plugin.attractors
 * @memberof Matter.Body
 */

/**
 * An attractor function calculates the force to be applied
 * to `bodyB`, it should either:
 * - return the force vector to be applied to `bodyB`
 * - or apply the force to the body(s) itself
 * @callback AttractorFunction
 * @param {Matter.Body} bodyA
 * @param {Matter.Body} bodyB
 * @returns {Vector|undefined} a force vector (optional)
 */

export default MatterAttractors

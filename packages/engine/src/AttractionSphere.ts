import Matter from 'matter-js'
import World from './World'
import MatterAttractors from './lib/matterAttractors'
// import map from '@astroparty/shared/utils/map'

class AttractionSphere {
  public static LABEL = 'attraction_sphere'
  public static HITBOX_RADIUS = 28
  public static MASS = 1000
  body: Matter.Body
  world: World

  constructor(position: Matter.Vector, world: World) {
    this.body = AttractionSphere.createBody(position)
    this.body.label = AttractionSphere.LABEL
    this.world = world

    Matter.World.addBody(this.world.instance, this.body)
  }

  public static negativeGravity(bodyA: Matter.Body, bodyB: Matter.Body) {
    const bToA = Matter.Vector.sub(bodyB.position, bodyA.position),
      distanceSq = Matter.Vector.magnitudeSquared(bToA) || 0.0001,
      normal = Matter.Vector.normalise(bToA),
      magnitude =
        -MatterAttractors.Attractors.gravityConstant *
        ((bodyA.mass * bodyB.inverseMass) / distanceSq),
      force = Matter.Vector.mult(normal, magnitude)

    bodyB.torque = magnitude * 1000
    Matter.Body.applyForce(bodyB, bodyB.position, Matter.Vector.neg(force))
  }

  public static createBody(position: Matter.Vector): Matter.Body {
    return Matter.Bodies.circle(
      position.x,
      position.y,
      AttractionSphere.HITBOX_RADIUS,
      {
        friction: 0,
        frictionAir: 0,
        angularVelocity: 0,
        restitution: 0,
        mass: AttractionSphere.MASS,
        isStatic: true,
        plugin: {
          attractors: [AttractionSphere.negativeGravity],
        },
      }
    )
  }
}

export default AttractionSphere

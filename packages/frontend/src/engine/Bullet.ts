import getAngleVector from 'src/utils/getAngleVector'
import World from './World'
import Matter from 'matter-js'
import Player from './Player'

class Bullet {
  public static RADIUS = 4
  public static VELOCITY = 10
  public static LABEL_PREFIX = 'bullet_'

  id: string
  playerId: string
  world: World
  body: Matter.Body
  interpolation: number

  constructor(id: string, player: Player) {
    this.id = id
    this.playerId = player.id
    this.world = player.world
    this.body = Bullet.createBody(player.body)
    this.body.label = Bullet.getLabelFromId(id)
    this.interpolation = 1
  }

  public update(interpolation: number) {
    this.interpolation = interpolation

    this.forward()
  }

  private forward() {
    Matter.Body.setVelocity(
      this.body,
      Matter.Vector.mult(getAngleVector(this.body), Bullet.VELOCITY)
    )
  }

  public static getLabelFromId(id: string) {
    return Bullet.LABEL_PREFIX + id
  }

  public static getIdFromLabel(label: string) {
    return label.substring(Bullet.LABEL_PREFIX.length)
  }

  public static isBullet(body: Matter.Body) {
    return body.label.startsWith(Bullet.LABEL_PREFIX)
  }

  public static createBody(playerBody: Matter.Body): Matter.Body {
    const position = Matter.Vector.add(
      playerBody.position,
      Matter.Vector.rotate(
        Matter.Vector.create(Player.HITBOX_RADIUS + Bullet.RADIUS, 0),
        playerBody.angle
      )
    )

    return Matter.Bodies.circle(position.x, position.y, Bullet.RADIUS, {
      friction: 0,
      angularVelocity: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 1,
      isSensor: true,
      angle: playerBody.angle,
    })
  }
}

export default Bullet

import getAngleVector from './utils/getAngleVector'
import World from './World'
import Matter from 'matter-js'
import Player from './Player'

export type BulletConstructorProps = {
  id: string
  angle: number
  playerPosition: Matter.Vector
  playerId: Player['id']
  world: World
}

class Bullet {
  public static RADIUS = 4
  public static VELOCITY = 10
  public static LABEL_PREFIX = 'bullet_'

  id: string
  playerId: string
  world: World
  body: Matter.Body
  /** Флаг для состояния, когда пулька обновляется по данным с сервера */
  isServerControlled: boolean
  isAcknowledgedByServer: boolean

  constructor({
    id,
    angle,
    playerPosition,
    playerId,
    world,
  }: BulletConstructorProps) {
    this.id = id
    this.playerId = playerId
    this.world = world
    this.body = Bullet.createBody({ angle, playerPosition })
    this.body.label = Bullet.getLabelFromId(id)
    this.isServerControlled = false
    this.isAcknowledgedByServer = false
  }

  public setId(id: Bullet['id']) {
    this.id = id
    this.body.label = Bullet.getLabelFromId(id)
  }

  public update() {
    if (this.isServerControlled) return

    this.forward()
  }

  private forward() {
    Matter.Body.setVelocity(
      this.body,
      Matter.Vector.mult(getAngleVector(this.body), Bullet.VELOCITY)
    )
  }

  public setServerControlled(state: boolean) {
    this.isServerControlled = state
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

  public static createBody({
    angle,
    playerPosition,
  }: Pick<BulletConstructorProps, 'angle' | 'playerPosition'>): Matter.Body {
    const position = Matter.Vector.add(
      playerPosition,
      Matter.Vector.rotate(
        Matter.Vector.create(Player.HITBOX_RADIUS + Bullet.RADIUS, 0),
        angle
      )
    )

    return Matter.Bodies.circle(position.x, position.y, Bullet.RADIUS, {
      friction: 0,
      angularVelocity: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 1,
      mass: 10,
      isSensor: true,
      angle: angle,
    })
  }
}

export default Bullet

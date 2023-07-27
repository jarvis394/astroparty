import World from './World'
import Matter from 'matter-js'
import { degreesToRadian, lerp } from '@astroparty/shared/utils'

const PLAYER_HITBOX_RADIUS = 20
const PLAYER_VELOCITY = 5
const PLAYER_ROTATE_ANGLE = 6
const DASH_ROTATE_ANGLE = 60
const DASH_TIMEOUT = 200
const DASH_VELOCITY = PLAYER_VELOCITY * 2
const PLAYER_VELOCITY_FORCE = 0.001

const getAngleVector = (body: Matter.Body): Matter.Vector => {
  return Matter.Vector.create(Math.cos(body.angle), Math.sin(body.angle))
}

class Player {
  id: string
  world: World
  body: Matter.Body
  interpolation: number
  /** Угол поворота в градусах */
  angle: number
  isRotating: boolean
  isDashing: boolean
  /** Вспомогательный флаг для единовременного ускорения при прыжке */
  dashHasBoostedFlag = false
  /** Время последнего прыжка в unix */
  lastDashed: number

  constructor(id: string, position: Matter.Vector, world: World) {
    this.id = id
    this.world = world
    this.body = Player.createBody(position)
    this.isRotating = false
    this.isDashing = false
    this.angle = 0
    this.lastDashed = -1
    this.interpolation = 1

    Matter.World.addBody(this.world.instance, this.body)
  }

  public forward() {
    if (this.body.speed < PLAYER_VELOCITY) {
      Matter.Body.applyForce(
        this.body,
        this.body.position,
        Matter.Vector.mult(getAngleVector(this.body), PLAYER_VELOCITY_FORCE)
      )
    }
  }

  public rotate() {
    if (this.isRotating) {
      this.angle += PLAYER_ROTATE_ANGLE * this.interpolation
    }

    Matter.Body.setAngularVelocity(this.body, 0)
    Matter.Body.setAngle(this.body, degreesToRadian(this.angle))
  }

  public dash() {
    const now = Date.now()

    if (this.lastDashed + DASH_TIMEOUT <= now) {
      this.lastDashed = now
      this.isDashing = true
      this.dashHasBoostedFlag = false
      // Меняем угол именно здесь, так как нужно поменять его до того, как мы будем
      // воздействовать на скорость игрока; иначе он ускорится по неправильному углу
      this.angle += DASH_ROTATE_ANGLE
    }
  }

  private processDashVelocity() {
    if (!this.isDashing) return

    // Прибавляем газу если ещё не прибавляли
    if (!this.dashHasBoostedFlag) {
      this.dashHasBoostedFlag = true
      Matter.Body.setVelocity(
        this.body,
        Matter.Vector.mult(
          getAngleVector(this.body),
          DASH_VELOCITY / this.interpolation
        )
      )
    }

    const velocityVector = Matter.Vector.mult(
      getAngleVector(this.body),
      PLAYER_VELOCITY * this.interpolation
    )
    Matter.Body.setVelocity(this.body, {
      x: lerp(this.body.velocity.x, velocityVector.x, 0.1),
      y: lerp(this.body.velocity.y, velocityVector.y, 0.1),
    })

    // Перестаём воздействовать на скорость, когда она уравнялась к максимальной скорости игрока
    if (this.body.speed <= PLAYER_VELOCITY) {
      this.isDashing = false
    }
  }

  public update(interpolation: number) {
    this.interpolation = interpolation

    this.rotate()
    this.forward()
    this.processDashVelocity()
  }

  public static createBody(position: Matter.Vector): Matter.Body {
    return Matter.Bodies.circle(position.x, position.y, PLAYER_HITBOX_RADIUS, {
      friction: 0,
      angularVelocity: 0,
    })
  }
}

export default Player

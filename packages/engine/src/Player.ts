import World from './World'
import Matter from 'matter-js'
import { degreesToRadian } from '@astroparty/shared/utils'
import { ShipSprite } from '@astroparty/shared/types/ShipSprite'
import Bullet from './Bullet'
import getAngleVector from './utils/getAngleVector'
import Engine from './Engine'
import map from '@astroparty/shared/utils/map'

export enum AliveState {
  ALIVE,
  /**
   * Состояние, когда корабль уничтожен и в космосе плавает астронавт.
   * Через 5 секунд корабль восстанавливается.
   */
  CRAFT_DESTROYED,
  DEAD,
}

export type PlayerConstructorProps = {
  id: string
  position: Matter.Vector
  shipSprite: ShipSprite
  world: World
}

class Player {
  public static LABEL_PREFIX = 'player_'
  public static HITBOX_RADIUS = 18
  public static CRAFT_DESTROYED_HITBOX_RADIUS = 9
  public static CRAFT_DESTROYED_BODY_RESTITUTION = 0.7
  public static BODY_RESTITUTION = 0
  public static VELOCITY = 4
  public static VELOCITY_FORCE = 0.0005
  public static BODY_FRICTION_AIR = 0.01
  public static ROTATE_ANGLE = 5
  public static BULLETS_AMOUNT = 3
  public static DASH_ROTATE_ANGLE = 60
  public static DASH_TIMEOUT_MS = 300
  public static DASH_VELOCITY_FORCE = 0.075
  public static DASH_BODY_FRICTION_AIR = 0.2
  public static BULLET_KNOCKBACK_FORCE = Player.VELOCITY_FORCE * 6
  public static BULLET_REPLENISH_TIMEOUT = 2000
  public static PLAYER_COLLISION_CATEGORY = 0x0010
  public static BODY_MASS = 1
  public static CRAFT_DESTROYED_BODY_MASS = 1

  id: string
  world: World
  body: Matter.Body
  bullets: number
  /** Угол поворота в градусах */
  angle: number
  isRotating: boolean
  isDashing: boolean
  /** Время последнего прыжка в unix */
  lastDashedMs: number
  /**
   * Флаг для обозначения игрока врагом. Изначально всегда `true`;
   * для главного игрока нужно ставить `World.setMe(player)`,
   * как и для игроков в команде главного игрока, чтобы изменить значение на `false`
   * @default true
   */
  isOpponent: boolean
  isMe: boolean
  /**
   * Флаг для управления игроком (движения вперёд), когда корабль уничтожен (`AliveState.CRAFT_DESTROYED`)
   */
  isBoosting: boolean
  /** Флаг для состояния, когда игрок обновляется по данным с сервера */
  isServerControlled: boolean
  shipSprite: ShipSprite
  latency: number
  private _aliveState: AliveState

  constructor({ id, position, shipSprite, world }: PlayerConstructorProps) {
    this.id = id
    this.world = world
    this.body = Player.createBody(position)
    this.body.label = Player.getLabelFromId(id)
    this.isRotating = false
    this.isDashing = false
    this.angle = 0
    this.lastDashedMs = -1
    this.bullets = Player.BULLETS_AMOUNT
    this._aliveState = AliveState.ALIVE
    this.isOpponent = true
    this.isMe = false
    this.isBoosting = false
    this.isServerControlled = false
    this.shipSprite = shipSprite
    this.latency = 0
  }

  public dash(): boolean {
    if (this.aliveState !== AliveState.ALIVE) return false

    const now = Engine.now()

    if (this.lastDashedMs + Player.DASH_TIMEOUT_MS <= now) {
      this.lastDashedMs = now
      this.isDashing = true
      this.angle += Player.DASH_ROTATE_ANGLE
      Matter.Body.setAngle(this.body, degreesToRadian(this.angle))
      Matter.Body.applyForce(
        this.body,
        this.body.position,
        Matter.Vector.mult(
          getAngleVector(this.body),
          Player.DASH_VELOCITY_FORCE
        )
      )

      return true
    }

    return false
  }

  public shoot(): Bullet | false {
    if (this.aliveState !== AliveState.ALIVE) return false
    if (this.bullets <= 0) {
      return false
    }

    const bullet = this.world.createBullet({
      playerId: this.id,
      playerPosition: this.body.position,
      angle: this.body.angle,
      world: this.world,
    })
    this.world.addBullet(bullet)
    this.bullets -= 1

    Matter.Body.applyForce(
      this.body,
      this.body.position,
      Matter.Vector.neg(
        Matter.Vector.mult(
          getAngleVector(this.body),
          Player.BULLET_KNOCKBACK_FORCE
        )
      )
    )

    setTimeout(() => {
      this.bullets += 1
    }, Player.BULLET_REPLENISH_TIMEOUT)

    return bullet
  }

  public set aliveState(value: AliveState) {
    switch (value) {
      case AliveState.ALIVE: {
        if (this.aliveState === AliveState.ALIVE) {
          break
        }

        this.makeAlive()
        break
      }
      case AliveState.CRAFT_DESTROYED: {
        if (
          this.aliveState === AliveState.CRAFT_DESTROYED ||
          this.aliveState === AliveState.DEAD
        ) {
          break
        }

        this.makeCraftDestroyed()
        break
      }
      case AliveState.DEAD: {
        this.makeDead()
        break
      }
    }

    this._aliveState = value
  }

  public get aliveState() {
    return this._aliveState
  }

  public setServerControlled(state: boolean) {
    this.isServerControlled = state
  }

  public setLatency(latency: number) {
    this.latency = latency
  }

  public update() {
    if (this.isServerControlled) return

    this.processRotate()
    this.processDash()
    this.forward()
  }

  public forward() {
    if (this.aliveState === AliveState.DEAD) return
    if (this.aliveState === AliveState.CRAFT_DESTROYED && !this.isBoosting)
      return

    if (this.body.speed < Player.VELOCITY) {
      const force =
        Player.VELOCITY_FORCE * (1 - map(this.latency, 0, 100, 0, 0.5))

      Matter.Body.applyForce(
        this.body,
        this.body.position,
        Matter.Vector.mult(getAngleVector(this.body), force)
      )
    }
  }

  public processRotate() {
    if (this.isRotating) {
      this.angle += Player.ROTATE_ANGLE
    }

    Matter.Body.setAngularVelocity(this.body, 0)
    Matter.Body.setAngle(this.body, degreesToRadian(this.angle))
  }

  public processDash() {
    if (!this.isDashing) return

    Matter.Body.set(this.body, {
      frictionAir: Player.DASH_BODY_FRICTION_AIR,
    })

    // Перестаём воздействовать на скорость, когда она уравнялась к максимальной скорости игрока
    if (this.body.speed <= Player.VELOCITY) {
      this.isDashing = false
      Matter.Body.set(this.body, {
        frictionAir: Player.BODY_FRICTION_AIR,
      })
    }
  }

  private makeCraftDestroyed() {
    const scale = Player.CRAFT_DESTROYED_HITBOX_RADIUS / Player.HITBOX_RADIUS
    Matter.Body.scale(this.body, scale, scale)
    Matter.Body.set(this.body, {
      restitution: Player.CRAFT_DESTROYED_BODY_RESTITUTION,
      mass: Player.CRAFT_DESTROYED_BODY_MASS,
    })
  }

  private makeAlive() {
    const scale = Player.HITBOX_RADIUS / Player.CRAFT_DESTROYED_HITBOX_RADIUS
    Matter.Body.scale(this.body, scale, scale)
    Matter.Body.set(this.body, {
      restitution: Player.BODY_RESTITUTION,
    })
  }

  private makeDead() {
    // TODO: impl dead state
  }

  public static getLabelFromId(id: string) {
    return Player.LABEL_PREFIX + id
  }

  public static getIdFromLabel(label: string) {
    return label.substring(Player.LABEL_PREFIX.length)
  }

  public static isPlayer(body: Matter.Body) {
    return body.label.startsWith(Player.LABEL_PREFIX)
  }

  public static createBody(position: Matter.Vector): Matter.Body {
    return Matter.Bodies.circle(position.x, position.y, Player.HITBOX_RADIUS, {
      frictionAir: Player.BODY_FRICTION_AIR,
      restitution: Player.BODY_RESTITUTION,
      mass: Player.BODY_MASS,
      friction: 0,
      angularVelocity: 0,
      collisionFilter: {
        category: Player.PLAYER_COLLISION_CATEGORY,
      },
    })
  }
}

export default Player

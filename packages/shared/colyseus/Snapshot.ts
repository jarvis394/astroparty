import { Engine, Player, AliveState } from '@astroparty/engine'
import Matter from 'matter-js'
import { degreesToRadian } from '../utils'

export class SnapshotHistory {
  public static MAX_LENGTH = 100
  maxLength: number
  history: Record<Snapshot['frame'], Snapshot>
  length: number
  firstFrame: number | null
  lastFrame: number | null

  constructor(maxLength: number = SnapshotHistory.MAX_LENGTH) {
    this.history = {}
    this.firstFrame = null
    this.lastFrame = null
    this.length = 0
    this.maxLength = maxLength
  }

  isEmpty() {
    return this.length === 0
  }

  push(frame: Snapshot['frame'], snapshot: Snapshot) {
    if (this.isEmpty()) {
      this.firstFrame = frame
    }

    this.history[frame] = snapshot
    this.lastFrame = frame

    this.length++

    if (this.length > this.maxLength) {
      this.shift()
    }
  }

  shift() {
    if (this.isEmpty() || !this.firstFrame) {
      return false
    }
    const snapshot = this.history[this.firstFrame]
    delete this.history[this.firstFrame]
    this.firstFrame++
    this.length--
    return snapshot
  }

  at(frame: number): Snapshot | false {
    if (this.history[frame] === undefined) {
      return false
    }

    return this.history[frame]
  }

  update(frame: number, snapshot: Snapshot) {
    this.history[frame] = snapshot
  }

  reset() {
    this.history = {}
    this.firstFrame = null
    this.lastFrame = null
    this.length = 0
  }
}

export class SnapshotPlayer {
  id: string
  bullets: number
  angle: number
  aliveState: AliveState
  position: Matter.Vector
  velocity: Matter.Vector
  angularVelocity: number

  constructor({
    id,
    position,
    angle = 0,
    bullets = Player.BULLETS_AMOUNT,
    aliveState = AliveState.ALIVE,
    velocity,
    angularVelocity,
  }: {
    id: string
    bullets: number
    angle: number
    aliveState: AliveState
    position: Matter.Vector
    velocity: Matter.Vector
    angularVelocity: number
  }) {
    this.id = id
    this.position = position
    this.angle = angle
    this.aliveState = aliveState
    this.bullets = bullets
    this.velocity = velocity
    this.angularVelocity = angularVelocity
  }
}

export class SnapshotBullet {
  id: string
  playerId: string
  position: Matter.Vector

  constructor({
    id,
    position,
    playerId,
  }: {
    id: string
    playerId: string
    position: Matter.Vector
  }) {
    this.id = id
    this.playerId = playerId
    this.position = position
  }
}

export class Snapshot {
  frame: number
  next: Snapshot | null
  players: Record<SnapshotPlayer['id'], SnapshotPlayer>
  bullets: Record<SnapshotBullet['id'], SnapshotBullet>

  constructor({
    frame,
    players,
    bullets,
    next = null,
  }: {
    frame: number
    next: Snapshot | null
    players: Record<SnapshotPlayer['id'], SnapshotPlayer>
    bullets: Record<SnapshotBullet['id'], SnapshotBullet>
  }) {
    this.frame = frame
    this.players = players
    this.bullets = bullets
    this.next = next
  }

  public static generateSnapshot(engine: Engine): Snapshot {
    const players: Record<SnapshotPlayer['id'], SnapshotPlayer> = {}
    const bullets: Record<SnapshotBullet['id'], SnapshotBullet> = {}

    engine.game.world.players.forEach((player) => {
      players[player.id] = new SnapshotPlayer({
        id: player.id,
        position: {
          x: player.body.position.x,
          y: player.body.position.y,
        },
        bullets: player.bullets,
        aliveState: player.aliveState,
        angle: player.angle,
        velocity: player.body.velocity,
        angularVelocity: player.body.angularVelocity,
      })
    })

    engine.game.world.bullets.forEach((bullet) => {
      bullets[bullet.id] = new SnapshotBullet({
        id: bullet.id,
        position: {
          x: bullet.body.position.x,
          y: bullet.body.position.y,
        },
        playerId: bullet.playerId,
      })
    })

    return new Snapshot({
      frame: engine.frame,
      bullets,
      players,
      next: null,
    })
  }

  // TODO fixme remove overrideLocal
  public static syncEngineBySnapshot(
    engine: Engine,
    snapshot: Snapshot,
    overrideLocal = false
  ) {
    engine.game.world.players.forEach((player) => {
      const snapshotPlayer = snapshot.players[player.id]

      if (!snapshotPlayer) {
        return engine.game.world.removePlayer(player.id)
      }

      // TODO fixme remove overrideLocal
      if (!overrideLocal && !player.isServerControlled) return

      console.log('!!!!! From snapshot: player angle -', snapshotPlayer.angle)

      Matter.Body.setPosition(player.body, snapshotPlayer.position)
      Matter.Body.setVelocity(player.body, snapshotPlayer.velocity)
      Matter.Body.setAngle(player.body, degreesToRadian(player.angle))
      Matter.Body.setAngularVelocity(
        player.body,
        snapshotPlayer.angularVelocity
      )
      player.angle = snapshotPlayer.angle
      player.aliveState = snapshotPlayer.aliveState
      player.bullets = snapshotPlayer.bullets
    })

    engine.game.world.bullets.forEach((bullet) => {
      const snapshotBullet = snapshot.bullets[bullet.id]

      if (!snapshotBullet) {
        return engine.game.world.removeBullet(bullet.id)
      }

      if (!bullet.isServerControlled) return

      Matter.Body.setPosition(bullet.body, snapshotBullet.position)
      Matter.Body.setVelocity(bullet.body, { x: 0, y: 0 })
    })

    Object.values(snapshot.bullets).forEach((snapshotBullet) => {
      if (engine.game.world.getBulletByID(snapshotBullet.id)) return

      const player = engine.game.world.getPlayerByID(snapshotBullet.playerId)

      if (!player) {
        console.error(
          `No player with ID "${snapshotBullet.playerId}" was found when trying to add bullet`
        )
        return
      }

      const bullet = engine.game.world.createBullet(player, snapshotBullet.id)
      bullet.setServerControlled(true)
      engine.game.world.addBullet(bullet)
    })

    engine.frame = snapshot.frame
  }
}

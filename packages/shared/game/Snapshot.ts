import { Engine, AliveState, Bullet } from '@astroparty/engine'
import Matter from 'matter-js'
import { degreesToRadian } from '../utils'
import { Types } from '@geckos.io/snapshot-interpolation'
import { ShipSprite } from '../types/ShipSprite'

export type SnapshotPlayer = {
  id: string
  bullets: number
  angle: number
  shipSprite: ShipSprite
  aliveState: AliveState
  positionX: number
  positionY: number
  velocityX: number
  velocityY: number
  isRotating: number
  isDashing: number
}

export type SnapshotBullet = {
  id: string
  angle: number
  playerId: string
  positionX: number
  positionY: number
}

export interface Snapshot extends Types.Snapshot {
  id: Types.ID
  time: Types.Time
  state: {
    players: SnapshotPlayer[]
    bullets: SnapshotBullet[]
  }
}

export const generateSnapshot = (engine: Engine): Snapshot => {
  const players: SnapshotPlayer[] = []
  const bullets: SnapshotBullet[] = []

  engine.game.world.players.forEach((player) => {
    players.push({
      id: player.id,
      positionX: player.body.position.x,
      positionY: player.body.position.y,
      bullets: player.bullets,
      aliveState: player.aliveState,
      angle: player.angle,
      shipSprite: player.shipSprite,
      velocityX: player.body.velocity.x,
      velocityY: player.body.velocity.y,
      isRotating: Number(player.isRotating),
      isDashing: Number(player.isDashing),
    })
  })

  engine.game.world.bullets.forEach((bullet) => {
    bullets.push({
      id: bullet.id,
      positionX: bullet.body.position.x,
      positionY: bullet.body.position.y,
      angle: bullet.body.angle,
      playerId: bullet.playerId,
    })
  })

  return {
    id: engine.frame.toString(),
    time: Engine.now(),
    state: {
      players,
      bullets,
    },
  }
}

type RestoreEngineOptions = {
  includeNonServerControlled?: boolean
}
export const restoreEngineFromSnapshot = (
  engine: Engine,
  snapshot: Snapshot,
  options: RestoreEngineOptions = {
    includeNonServerControlled: false,
  }
) => {
  restorePlayersFromSnapshot(engine, snapshot.state.players, options)
  restoreBulletsFromSnapshot(engine, snapshot.state.bullets, options)

  engine.frame = Number(snapshot.id)
  engine.frameTimestamp = snapshot.time
}

export const restorePlayersFromSnapshot = (
  engine: Engine,
  players: Snapshot['state']['players'],
  options: RestoreEngineOptions = {
    includeNonServerControlled: false,
  }
) => {
  players.forEach((snapshotPlayer) => {
    const enginePlayer = engine.game.world.getPlayerByID(snapshotPlayer.id)

    if (!enginePlayer) {
      return
    }

    enginePlayer.aliveState = snapshotPlayer.aliveState

    // We update local player's bullets in `shoot_ack` event
    if (!enginePlayer.isMe) {
      enginePlayer.bullets = snapshotPlayer.bullets
    }

    // Do not update player by snapshot if it is not controlled by snapshots (by server)
    // Update if we override it in options
    if (!options.includeNonServerControlled && !enginePlayer.isServerControlled)
      return

    Matter.Body.setPosition(
      enginePlayer.body,
      Matter.Vector.create(snapshotPlayer.positionX, snapshotPlayer.positionY)
    )
    Matter.Body.setVelocity(
      enginePlayer.body,
      Matter.Vector.create(snapshotPlayer.velocityX, snapshotPlayer.velocityY)
    )
    Matter.Body.setAngle(enginePlayer.body, degreesToRadian(enginePlayer.angle))
    Matter.Body.setAngularVelocity(enginePlayer.body, 0)
    enginePlayer.angle = snapshotPlayer.angle
  })

  return engine
}

export const restoreBulletsFromSnapshot = (
  engine: Engine,
  bullets: Snapshot['state']['bullets'],
  options: RestoreEngineOptions = {
    includeNonServerControlled: false,
  }
) => {
  bullets.forEach((snapshotBullet) => {
    let engineBullet = engine.game.world.getBulletByID(snapshotBullet.id)

    if (!engineBullet) {
      const player = engine.game.world.getPlayerByID(snapshotBullet.playerId)

      // TODO can be a state when a bullet was shot and player has already disconnected
      if (!player) return

      // Do not recreate bullet if it is removed in client engine
      // We handle all bullets with local playerId locally (with client engine)
      if (snapshotBullet.playerId === engine.game.me?.id) {
        return
      }

      engineBullet = new Bullet({
        id: snapshotBullet.id,
        playerId: player.id,
        playerPosition: player.body.position,
        angle: player.body.angle,
        world: player.world,
      })
      engineBullet.setServerControlled(true)
      engine.game.world.addBullet(engineBullet)
    }

    // Do not update bullet by snapshot if it is not controlled by snapshots (by server)
    // Update if we override it in options
    if (!options.includeNonServerControlled && !engineBullet.isServerControlled)
      return

    Matter.Body.setPosition(
      engineBullet.body,
      Matter.Vector.create(snapshotBullet.positionX, snapshotBullet.positionY)
    )
    Matter.Body.setAngle(engineBullet.body, snapshotBullet.angle)
  })

  for (const engineBullet of engine.game.world.getAllBulletsIterator()) {
    const snapshotBullet = bullets?.some((e) => e.id === engineBullet.id)

    if (snapshotBullet || !engineBullet.isServerControlled) continue

    engine.game.world.removeBullet(engineBullet.id)
  }
}

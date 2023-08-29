import { Engine, AliveState, Bullet } from '@astroparty/engine'
import Matter from 'matter-js'
import { degreesToRadian } from '../utils'
import { Types } from '@geckos.io/snapshot-interpolation'

export type SnapshotPlayer = {
  id: string
  bullets: number
  angle: number
  aliveState: AliveState
  positionX: number
  positionY: number
  velocityX: number
  velocityY: number
}

export type SnapshotBullet = {
  id: string
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
      velocityX: player.body.velocity.x,
      velocityY: player.body.velocity.y,
    })
  })

  engine.game.world.bullets.forEach((bullet) => {
    bullets.push({
      id: bullet.id,
      positionX: bullet.body.position.x,
      positionY: bullet.body.position.y,
      playerId: bullet.playerId,
    })
  })

  return {
    id: engine.frame.toString(),
    time: Date.now(),
    state: {
      players,
      bullets,
    },
  }
}

export const restoreEngineFromSnapshot = (
  engine: Engine,
  snapshot: Snapshot
) => {
  restorePlayersFromSnapshot(engine, snapshot.state.players)
  restoreBulletsFromSnapshot(engine, snapshot.state.bullets)

  engine.frame = Number(snapshot.id)
}

export const restorePlayersFromSnapshot = (
  engine: Engine,
  players: Snapshot['state']['players']
) => {
  players.forEach((snapshotPlayer) => {
    const enginePlayer = engine.game.world.getPlayerByID(snapshotPlayer.id)

    if (!enginePlayer) {
      return
    }

    // Set player's alive state dirty if it has updated
    if (enginePlayer.aliveState !== snapshotPlayer.aliveState) {
      enginePlayer.hasSyncedAliveState = false
    }

    enginePlayer.aliveState = snapshotPlayer.aliveState
    enginePlayer.bullets = snapshotPlayer.bullets

    // Do not update player by snapshot if it is not controlled by snapshots (by server)
    if (!enginePlayer.isServerControlled) return

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
  bullets: Snapshot['state']['bullets']
) => {
  bullets.forEach((snapshotBullet) => {
    let engineBullet = engine.game.world.getBulletByID(snapshotBullet.id)

    if (!engineBullet) {
      const player = engine.game.world.getPlayerByID(snapshotBullet.playerId)

      // TODO can be a state when a bullet was shot and player has already disconnected
      if (!player) return

      engineBullet = new Bullet(snapshotBullet.id, player)
      engineBullet.setServerControlled(true)
      engine.game.world.addBullet(engineBullet)
    }

    // Do not update bullet by snapshot if it is not controlled by snapshots (by server)
    if (!engineBullet.isServerControlled) return

    Matter.Body.setPosition(
      engineBullet.body,
      Matter.Vector.create(snapshotBullet.positionX, snapshotBullet.positionY)
    )
  })

  for (const engineBullet of engine.game.world.getAllBulletsIterator()) {
    const snapshotBullet = bullets?.some((e) => e.id === engineBullet.id)

    if (snapshotBullet) return

    engine.game.world.removeBullet(engineBullet.id)
  }
}

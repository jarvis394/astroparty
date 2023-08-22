import { Player, AliveState } from '@astroparty/engine'

export class SnapshotBuffer {
  first: Snapshot | null
  last: Snapshot | null
  length: number

  constructor() {
    this.first = null
    this.last = null
    this.length = 0
  }

  isEmpty() {
    return this.first === null && this.last === null
  }

  reset() {
    this.first = null
    this.last = null
    this.length = 0
  }

  push(snapshot: Snapshot) {
    if (this.first === null) {
      this.first = snapshot
      this.last = snapshot
    } else {
      this.last && (this.last.next = snapshot)
      this.last = snapshot
    }

    this.length++

    return snapshot
  }

  shift() {
    if (this.first === null) {
      return false
    }

    const snapshot = this.first
    if (this.first.next) {
      this.first = this.first.next
    } else {
      this.first = null
      this.last = null
    }

    this.length--

    return snapshot
  }
}

export class SnapshotPlayer {
  id: string
  bullets: number
  angle
  aliveState: AliveState
  position: Matter.Vector

  constructor({
    id,
    position,
    angle = 0,
    bullets = Player.BULLETS_AMOUNT,
    aliveState = AliveState.ALIVE,
  }: {
    id: string
    bullets: number
    angle: number
    aliveState: AliveState
    position: Matter.Vector
  }) {
    this.id = id
    this.position = position
    this.angle = angle
    this.aliveState = aliveState
    this.bullets = bullets
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
  timestamp: number
  next: Snapshot | null
  players: Map<SnapshotPlayer['id'], SnapshotPlayer>
  bullets: Map<SnapshotBullet['id'], SnapshotBullet>

  constructor({
    frame,
    players,
    bullets,
    timestamp,
    next = null,
  }: {
    frame: number
    timestamp: number
    next: Snapshot | null
    players: Map<SnapshotPlayer['id'], SnapshotPlayer>
    bullets: Map<SnapshotBullet['id'], SnapshotBullet>
  }) {
    this.timestamp = timestamp
    this.frame = frame
    this.players = players
    this.bullets = bullets
    this.next = next
  }
}

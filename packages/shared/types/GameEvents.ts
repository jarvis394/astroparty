import { Bullet, Player } from '@astroparty/engine'
import { SnapshotPlayer, Snapshot } from '../game/Snapshot'

export enum GameEvents {
  INIT = '0',
  UPDATE = '1',
  ROTATE = '2',
  DASH = '3',
  SHOOT = '4',
  SHOOT_ACK = '5',
  PLAYER_JOIN = '6',
  PLAYER_LEFT = '7',
}

export interface InitEventMessage {
  playerId: Player['id']
  snapshot: Snapshot
  frame: number
}

export type UpdateEventMessage = Snapshot

export interface RotateEventMessage {
  action: 'start' | 'stop'
  frame: number
}

export type ShootEventMessage = string | undefined

export interface ShootAckEventMessage {
  localBulletId: Bullet['id']
  serverBulletId: Bullet['id']
  playerId: Player['id']
  playerBulletsAmount: number
}

export type PlayerJoinEventMessage = SnapshotPlayer

export type PlayerLeftEventMessage = SnapshotPlayer['id']

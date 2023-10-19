import { GameVector } from './GameVector'

export interface GameBullet {
	id: string
	playerId: string
	position: GameVector
	angle: number
}

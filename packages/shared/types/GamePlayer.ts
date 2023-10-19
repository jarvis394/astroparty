import { AliveState } from '@astroparty/engine'
import { ShipSprite } from './ShipSprite'
import { GameVector } from './GameVector'

export interface GamePlayer {
	id: string
	bullets: number
	aliveState: AliveState
	angle: number
	shipSprite: ShipSprite
	velocity: GameVector
	position: GameVector
}

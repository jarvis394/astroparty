import { GameBullet } from './GameBullet'
import { GamePlayer } from './GamePlayer'

export interface GameState {
  frame: number
  time: number
  players: Map<GamePlayer['id'], GamePlayer>
  bullets: Map<GameBullet['id'], GameBullet>
}

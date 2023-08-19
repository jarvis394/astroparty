import Matter from 'matter-js'
import World from './World'
import Player from './Player'

class Game {
  world: World
  me: Player | null

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    this.world = new World({ matterEngine })
    this.me = null
  }

  setMe(player: Player) {
    const worldPlayer = this.world.players.get(player.id)

    if (!worldPlayer) {
      throw new Error(`setMe: Игрок с id ${player.id} не найден`)
    }

    this.me = player
    worldPlayer.isOpponent = false
    worldPlayer.isMe = true
  }

  public update() {
    this.world.update()
  }
}

export default Game

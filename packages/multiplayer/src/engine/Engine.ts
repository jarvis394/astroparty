import { Engine } from '@astroparty/engine'
import ServerPlayer from './Player'
import ServerGame from './Game'

class ServerEngine extends Engine {
	game: ServerGame

	constructor() {
		super()
		this.game = new ServerGame({ matterEngine: this.matterEngine })
	}

  public createPlayer(id: string): ServerPlayer {
    const player = this.game.world.createPlayer(id)
    return player
  }
}

export default ServerEngine

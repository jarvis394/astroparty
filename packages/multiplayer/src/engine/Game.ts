import { Game } from '@astroparty/engine'
import Matter from 'matter-js'
import ServerPlayer from './Player'
import ServerWorld from './World'

class ServerGame extends Game {
  world: ServerWorld
  me: ServerPlayer | null

	constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
		super({ matterEngine })

		this.world = new ServerWorld({ matterEngine })
    this.me = null
	}
}

export default ServerGame

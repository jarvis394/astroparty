import { World } from '@astroparty/engine'
import Matter from 'matter-js'
import ServerPlayer from './Player'

class ServerWorld extends World {
	constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
		super({ matterEngine })
	}

	createPlayer(id: string): ServerPlayer {
		const spawnPositions = [
			Matter.Vector.create(100, 100),
			Matter.Vector.create(World.WORLD_WIDTH - 100, World.WORLD_HEIGHT - 100),
			Matter.Vector.create(World.WORLD_WIDTH - 100, 100),
			Matter.Vector.create(100, World.WORLD_HEIGHT - 100),
		]

		return new ServerPlayer(id, spawnPositions[this.players.size % spawnPositions.length], this)
	}
}

export default ServerWorld

import { AttractionSphere, World } from '@astroparty/engine'
import Matter from 'matter-js'
import ServerPlayer from './Player'
import { ShipSprite } from '@astroparty/shared/types/ShipSprite'

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
		const shipSprites = [ShipSprite.BLUE, ShipSprite.RED, ShipSprite.PURPLE, ShipSprite.GREEN]
		const n =
			Number(
				id
					.split('')
					.map((a) => a.charCodeAt(0))
					.join('')
			) % spawnPositions.length

		return new ServerPlayer({
			id,
			position: spawnPositions[n],
			shipSprite: shipSprites[n],
			world: this,
		})
	}
}

export default ServerWorld

import { Room, Client } from '@colyseus/core'
import { GameRoomState, SchemaPlayer, SchemaVector } from './game.schema'
import { Engine, Player } from '@astroparty/engine'
import Matter from 'matter-js'

export class GameRoom extends Room<GameRoomState> {
	maxClients = 4
	engine: Engine

	constructor() {
		super()
		this.engine = new Engine()
		this.setPatchRate(Engine.MIN_DELTA)
	}

	onCreate(options: any) {
		this.setState(new GameRoomState())

		this.setSimulationInterval((delta) => {
			this.engine.update(delta)

			for (const enginePlayer of this.engine.game.world.getAllPlayersIterator()) {
				const player = this.state.players.get(enginePlayer.id)

				if (!player) {
					console.error('No player found in room', this.roomId, 'with id', enginePlayer.id)
					return
				}

				player.position.x = enginePlayer.body.position.x
				player.position.y = enginePlayer.body.position.y
				player.angle = enginePlayer.angle
				player.bullets = enginePlayer.bullets
			}

			for (const engineBullet of this.engine.game.world.getAllBulletsIterator()) {
				const bullet = this.state.bullets.get(engineBullet.id)

				if (!bullet) {
					console.error('No bullet found in room', this.roomId, 'with id', engineBullet.id)
					return
				}

				bullet.position.x = engineBullet.body.position.x
				bullet.position.y = engineBullet.body.position.y
			}
		}, Engine.MIN_DELTA)

		this.onMessage('rotate', (client, message) => {
			const playerId = client.userData?.playerId
			const player = this.engine.game.world.getPlayerByID(playerId)

			if (!player) {
				return
			}

			console.log('rotate:', message)

			switch (message) {
				case 'start':
					return (player.isRotating = true)
				case 'stop':
					return (player.isRotating = false)
				default:
					return client.error(500, `rotate message incorrect, got "${message}"`)
			}
		})
	}

	onJoin(client: Client, options: any) {
		console.log(client.sessionId, 'joined!')
		const { playerId } = options
		const player = this.engine.addPlayer(playerId)
		const position = new SchemaVector(player.body.position.x, player.body.position.y)
		const schemaPlayer = new SchemaPlayer(playerId, position)
		this.state.players.set(playerId, schemaPlayer)
		client.userData = {
			playerId,
		}

		client.send('init_room', this.state)
	}

	onLeave(client: Client, consented: boolean) {
		console.log(client.sessionId, 'left!')
		this.engine.game.world.players.delete(client.userData.playerId)
		this.state.players.delete(client.userData.playerId)
	}

	onDispose() {
		console.log('room', this.roomId, 'disposing...')
	}
}

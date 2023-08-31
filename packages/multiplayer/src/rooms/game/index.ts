import { Room, Client } from '@colyseus/core'
import { GameRoomState, SchemaBullet, SchemaPlayer, SchemaVector } from '@astroparty/shared/colyseus/GameSchema'
import ServerEngine from 'src/engine/Engine'
import GameController from 'src/controllers/GameController'

export class GameRoom extends Room<GameRoomState> {
	maxClients = 4
	gameController: GameController

	constructor() {
		super()
		this.gameController = new GameController()
		this.setPatchRate(ServerEngine.MIN_DELTA)
	}

	onCreate(options: any) {
		this.clock.start()
		this.gameController.setRoomId(this.roomId)
		this.setState(new GameRoomState())
		this.setSimulationInterval(this.update.bind(this), ServerEngine.MIN_DELTA)

		this.onMessage('rotate', this.handleRotate.bind(this))
		this.onMessage('dash', this.handleDash.bind(this))
		this.onMessage('shoot', this.handleShoot.bind(this))
	}

	onJoin(client: Client, options: any) {
		const player = this.gameController.handlePlayerJoin(client, options)
		const position = new SchemaVector(player.body.position.x, player.body.position.y)
		const velocity = new SchemaVector(player.body.velocity.x, player.body.velocity.y)
		const schemaPlayer = new SchemaPlayer({
			id: player.id,
			position,
			shipSprite: player.shipSprite,
			velocity,
		})
		this.state.players.set(player.id, schemaPlayer)
		client.userData = {
			playerId: player.id,
		}

		client.send('init_room', this.state)

		this.clients.forEach((broadcastClient) => {
			// Skip just joined player
			if (broadcastClient.userData.playerId === player.id) return

			broadcastClient.send('player_join', schemaPlayer)
		})
	}

	onLeave(client: Client, consented: boolean) {
		const playerId = this.gameController.handlePlayerLeave(client, consented)
		this.state.players.delete(playerId)
		this.broadcast('player_left', playerId)
	}

	onDispose() {
		this.gameController.handleRoomDispose()
	}

	update(delta: number) {
		const snapshot = this.gameController.update(delta)
		this.gameController.syncRoomStateBySnapshot(this.state, snapshot)
	}

	handleRotate(
		client: Client,
		message: {
			action: 'start' | 'stop'
			frame: number
		}
	) {
		this.gameController.handleRotate(client, message)
	}

	handleDash(client: Client) {
		this.gameController.handleDash(client)
	}

	handleShoot(client: Client, message: string | false) {
		const bullet = this.gameController.handleShoot(client, message)

		if (!bullet) return

		const schemaPosition = new SchemaVector(bullet.body.position.x, bullet.body.position.y)
		const schemaBullet = new SchemaBullet(bullet.id, bullet.playerId, schemaPosition)
		this.state.bullets.set(schemaBullet.id, schemaBullet)
		this.state.spawns.push(schemaBullet.id)
	}
}

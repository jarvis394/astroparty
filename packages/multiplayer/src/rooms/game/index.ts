import { Room, Client } from '@colyseus/core'
import { GameRoomState, SchemaBullet, SchemaPlayer, SchemaVector } from '@astroparty/shared/colyseus/GameSchema'
import { Snapshot, SnapshotHistory } from '@astroparty/shared/colyseus/Snapshot'
import Matter from 'matter-js'
import ServerEngine from 'src/engine/Engine'

export class GameRoom extends Room<GameRoomState> {
	maxClients = 4
	engine: ServerEngine
	snapshotHistory: SnapshotHistory

	constructor() {
		super()
		this.engine = new ServerEngine()
		this.snapshotHistory = new SnapshotHistory()
		this.snapshotHistory.maxLength = 1000
		this.setPatchRate(ServerEngine.MIN_DELTA)
	}

	onCreate(options: any) {
		this.setState(new GameRoomState())
		this.setSimulationInterval(this.update.bind(this), ServerEngine.MIN_DELTA)

		this.onMessage('rotate', this.handleRotate.bind(this))
		this.onMessage('dash', this.handleDash.bind(this))
		this.onMessage('shoot', this.handleShoot.bind(this))
	}

	onJoin(client: Client, options: any) {
		const { playerId } = options
		const player = this.engine.createPlayer(playerId)
		player.isServerControlled = true
		const position = new SchemaVector(player.body.position.x, player.body.position.y)
		const velocity = new SchemaVector(player.body.velocity.x, player.body.velocity.y)
		const schemaPlayer = new SchemaPlayer({
			id: playerId,
			position,
			velocity,
			angularVelocity: player.body.angularVelocity,
		})
		this.state.players.set(playerId, schemaPlayer)
		this.engine.addPlayer(player)
		client.userData = {
			playerId,
		}

		client.send('init_room', this.state)
		this.clients.forEach((broadcastClient) => {
			// Skip just joined player
			if (broadcastClient.userData.playerId === playerId) return

			broadcastClient.send('player_join', schemaPlayer)
		})
	}

	onLeave(client: Client, consented: boolean) {
		const playerId = client.userData.playerId
		this.engine.removePlayer(playerId)
		this.state.players.delete(playerId)
		this.broadcast('player_left', playerId)
	}

	onDispose() {
		console.log('room', this.roomId, 'disposing...')
		Matter.Engine.clear(this.engine.matterEngine)
	}

	update(delta: number) {
		this.engine.update(delta)
		const snapshot = Snapshot.generateSnapshot(this.engine)
		this.syncStateWithEngine()
		this.snapshotHistory.push(snapshot.frame, snapshot)
		this.broadcast('snapshot', snapshot)
	}

	syncStateWithEngine() {
		this.state.frame = this.engine.frame

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
			player.aliveState = enginePlayer.aliveState
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

		this.state.bullets.forEach((bullet) => {
			if (!this.engine.game.world.getBulletByID(bullet.id)) {
				this.state.bullets.delete(bullet.id)
			}
		})
	}

	handleRotate(
		client: Client,
		message: {
			// action: 'start' | 'stop'
			frame: number
		}
	) {
		// const startTimestamp = Date.now()
		const playerId = client.userData?.playerId

		// // Restore world to frame `message.frame`
		// console.log('this.snapshotHistory.length:', this.snapshotHistory.length)
		// const snapshot = this.snapshotHistory.at(message.frame)
		// if (!snapshot) {
		// 	console.log('no snapshot', message)
		// 	return
		// }

		// console.log(snapshot.frame, snapshot.players[playerId].angle)

		// Snapshot.syncEngineBySnapshot(this.engine, snapshot)

		const player = this.engine.game.world.getPlayerByID(playerId)
		if (!player) {
			return
		}

		player.rotate()

		// switch (message.action) {
		// 	case 'start':
		// 		player.isRotating = true
		// 		break
		// 	case 'stop':
		// 		player.isRotating = false
		// 		break
		// 	default:
		// 		return client.error(500, `rotate message incorrect, got "${message}"`)
		// }

		// console.log(
		// 	'starting rotate from frame',
		// 	this.engine.frame,
		// 	'to',
		// 	this.state.frame,
		// 	message,
		// 	this.engine.game.world.getPlayerByID(playerId)?.angle
		// )
		// console.log('this.snapshotHistory.length:', this.snapshotHistory.length)

		// while (this.state.frame > this.engine.frame) {
		// 	this.engine.update(ServerEngine.MIN_DELTA)
		// 	const currentSnapshot = Snapshot.generateSnapshot(this.engine)
		// 	this.snapshotHistory.update(currentSnapshot.frame, currentSnapshot)
		// 	console.log(
		// 		this.engine.frame,
		// 		currentSnapshot.players[playerId].angle,
		// 		this.engine.game.world.getPlayerByID(playerId)?.angle,
		// 		this.engine.game.world.getPlayerByID(playerId)?.isRotating
		// 	)
		// }

		// console.log('stopped at frame', this.engine.frame, this.engine.game.world.getPlayerByID(playerId)?.angle)

		// this.syncStateWithEngine()
		// console.log('[rotate] time elapsed:', Date.now() - startTimestamp)
	}

	handleDash(client: Client) {
		const playerId = client.userData?.playerId
		const player = this.engine.game.world.getPlayerByID(playerId)

		if (!player) {
			return
		}

		player.dash()
	}

	handleShoot(client: Client) {
		const playerId = client.userData?.playerId
		const player = this.engine.game.world.getPlayerByID(playerId)

		if (!player) {
			return
		}

		const bullet = player.shoot()

		// Player doesn't have bullets, ignore message
		if (!bullet) {
			return
		}

		const schemaPosition = new SchemaVector(bullet.body.position.x, bullet.body.position.y)
		const schemaBullet = new SchemaBullet(bullet.id, playerId, schemaPosition)
		this.state.bullets.set(schemaBullet.id, schemaBullet)
	}
}

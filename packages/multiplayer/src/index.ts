import geckos, { Data, ServerChannel } from '@geckos.io/server'
import ClockTimer from '@gamestdio/timer'
import GameController from './controllers/GameController'
import { Engine } from '@astroparty/engine'
import { v4 } from 'uuid'
import { GameEvents, RotateEventMessage, ShootEventMessage } from '@astroparty/shared/types/GameEvents'
import { generateSnapshot } from '@astroparty/shared/game/Snapshot'

const io = geckos()
const rooms: Map<string, GameRoom> = new Map()
const avaliableRooms: Set<string> = new Set()

io.listen(9208)

class GameRoom {
	id: string
	maxPlayers = 4
	channels: Map<string, ServerChannel>
	game: GameController
	clock: ClockTimer
	private simulationInterval?: NodeJS.Timer

	constructor() {
		this.id = v4()
		this.channels = new Map()
		this.game = new GameController()
		this.clock = new ClockTimer()
		this.game.setRoomId(this.id)
	}

	init() {
		this.simulationInterval = setInterval(this.update.bind(this), Engine.MIN_DELTA)
		this.clock.start()
	}

	update() {
		this.clock.tick()

		const snapshot = this.game.update(this.clock.deltaTime)

		io.room(this.id).emit(GameEvents.UPDATE, snapshot)
	}

	destroy() {
		this.game.handleRoomDispose()
		this.clock.stop()
		clearInterval(this.simulationInterval)
	}

	addPlayer(channel: ServerChannel) {
		if (!this.canAddPlayer()) {
			throw new Error(`Cannot add player to a full room. Max players: ${this.maxPlayers}`)
		}

		const playerId = v4()

		// Add player to room
		channel.join(this.id)

		// Event bindings
		channel.onDisconnect(this.onPlayerLeave.bind(this, channel))
		channel.on(GameEvents.ROTATE, this.handlePlayerRotate.bind(this, channel))
		channel.on(GameEvents.DASH, this.handlePlayerDash.bind(this, channel))
		channel.on(GameEvents.SHOOT, this.handlePlayerShoot.bind(this, channel))

		this.channels.set(playerId, channel)

		const player = this.game.handlePlayerJoin(channel, { playerId })
		const snapshot = generateSnapshot(this.game.engine)
		const snapshotPlayer = snapshot.state.players.find((e) => e.id === playerId)

		channel.emit(GameEvents.INIT, { snapshot, playerId })

		this.channels.forEach((broadcastChannel) => {
			// Skip just joined player
			if (broadcastChannel.userData.playerId === player.id) return

			broadcastChannel.emit(GameEvents.PLAYER_JOIN, snapshotPlayer)
		})

		console.log('connected', playerId, 'to room', channel.roomId)
	}

	onPlayerLeave(channel: ServerChannel) {
		if (!channel.userData.playerId) return

		this.channels.delete(channel.userData.playerId)
		this.game.handlePlayerLeave(channel)

		console.log(`${channel.id} got disconnected`)
	}

	handlePlayerRotate(channel: ServerChannel, message: Data) {
		const decodedMessage = this.decodeMessage<RotateEventMessage>(message)
		decodedMessage && this.game.handleRotate(channel, decodedMessage)
	}

	handlePlayerDash(channel: ServerChannel, message: Data) {
		this.game.handleDash(channel)
	}

	handlePlayerShoot(channel: ServerChannel, message: Data) {
		const decodedMessage = this.decodeMessage<ShootEventMessage>(message)

		if (decodedMessage === null) return

		this.game.handleShoot(channel, decodedMessage)
	}

	canAddPlayer() {
		return this.channels.size < this.maxPlayers
	}

	decodeMessage<T>(message: Data): T | null {
		return message as T
	}
}

io.onConnection((channel) => {
	let hasAddedPlayerToRoom = false

	for (const roomId of avaliableRooms.values()) {
		const room = rooms.get(roomId)

		if (!room) {
			throw new Error('Should never happen: `roomId` from avaliableRooms does not exist in rooms')
		}

		room.addPlayer(channel)
		hasAddedPlayerToRoom = true

		if (!room.canAddPlayer()) {
			avaliableRooms.delete(roomId)
		}

		break
	}

	if (!hasAddedPlayerToRoom) {
		const room = new GameRoom()
		rooms.set(room.id, room)
		avaliableRooms.add(room.id)
		room.init()
		room.addPlayer(channel)
	}
})

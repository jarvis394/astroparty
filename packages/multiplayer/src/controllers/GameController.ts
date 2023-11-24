import { Bullet } from '@astroparty/engine'
import { Snapshot, generateSnapshot } from '@astroparty/shared/game/Snapshot'
import { GameEvents, ShootEventMessage } from '@astroparty/shared/types/GameEvents'
import { GameState } from '@astroparty/shared/types/GameState'
import { ServerChannel } from '@geckos.io/server'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import Matter from 'matter-js'
import { ServerEngine, ServerPlayer } from 'src/engine'

class GameController {
	engine: ServerEngine
	snapshotInterpolation: SnapshotInterpolation
	roomId: string | null

	constructor() {
		this.engine = new ServerEngine()
		this.snapshotInterpolation = new SnapshotInterpolation()
		this.roomId = null
	}

	setRoomId(roomId: string) {
		this.roomId = roomId
	}

	update(delta: number): Snapshot {
		this.engine.update(delta)

		const snapshot = generateSnapshot(this.engine)
		this.snapshotInterpolation.vault.add(snapshot)

		return snapshot
	}

	syncRoomStateBySnapshot(state: GameState, snapshot: Snapshot) {
		state.frame = Number(snapshot.id)
		state.time = snapshot.time

		for (const snapshotPlayer of snapshot.state.players) {
			const player = state.players.get(snapshotPlayer.id)

			if (!player) {
				return
			}

			player.position.x = snapshotPlayer.positionX
			player.position.y = snapshotPlayer.positionY
			player.angle = snapshotPlayer.angle
			player.bullets = snapshotPlayer.bullets
			player.aliveState = snapshotPlayer.aliveState
		}

		for (const snapshotBullet of snapshot.state.bullets) {
			const bullet = state.bullets.get(snapshotBullet.id)

			if (!bullet) {
				return
			}

			bullet.position.x = snapshotBullet.positionX
			bullet.position.y = snapshotBullet.positionY
		}

		state.players.forEach((player) => {
			if (!this.engine.game.world.getPlayerByID(player.id)) {
				state.players.delete(player.id)
			}
		})

		state.bullets.forEach((bullet) => {
			if (!this.engine.game.world.getBulletByID(bullet.id)) {
				state.bullets.delete(bullet.id)
			}
		})
	}

	handleRotate(
		channel: ServerChannel,
		message: {
			action: 'start' | 'stop'
			frame: number
		}
	) {
		const playerId = channel.userData?.playerId
		const player = this.engine.game.world.getPlayerByID(playerId)

		if (!player) {
			return
		}

		switch (message.action) {
			case 'start':
				player.isRotating = true
				channel.emit(GameEvents.ROTATE_START_ACK, { frame: message.frame })
				break
			case 'stop':
				player.isRotating = false
				channel.emit(GameEvents.ROTATE_END_ACK, { frame: message.frame })
				break
			default:
				return console.error(`rotate message from ${playerId} is incorrect, got "${message}"`)
		}
	}

	handleDash(channel: ServerChannel) {
		const playerId = channel.userData?.playerId
		const player = this.engine.game.world.getPlayerByID(playerId)

		if (!player) {
			return
		}

		player.dash()

		channel.emit(GameEvents.DASH_ACK)
	}

	handleShoot(channel: ServerChannel, localBulletId: ShootEventMessage): Bullet | false {
		const playerId = channel.userData?.playerId
		const player = this.engine.game.world.getPlayerByID(playerId)

		if (!player) {
			return false
		}

		const bullet = player.shoot()

		// Player doesn't have bullets, ignore message
		if (!bullet) {
			return false
		}

		if (localBulletId) {
			channel.emit(
				GameEvents.SHOOT_ACK,
				{
					localBulletId,
					serverBulletId: bullet.id,
					playerId: player.id,
					playerBulletsAmount: player.bullets,
				},
				{
					reliable: true,
				}
			)
		}

		return bullet
	}

	/** @returns Created player for newly joined client */
	handlePlayerJoin(channel: ServerChannel, options: any): ServerPlayer {
		const { playerId } = options
		const player = this.engine.createPlayer(playerId)
		this.engine.addPlayer(player)

		channel.userData = {
			playerId,
		}

		return player
	}

	/** @returns ID of disconnected player */
	handlePlayerLeave(channel: ServerChannel): ServerPlayer['id'] {
		const playerId = channel.userData.playerId
		this.engine.removePlayer(playerId)
		return playerId
	}

	handleRoomDispose() {
		console.log('room', this.roomId, 'disposing...')

		Matter.Engine.clear(this.engine.matterEngine)
	}
}

export default GameController

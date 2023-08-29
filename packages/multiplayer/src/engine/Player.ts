import { Player, World } from '@astroparty/engine'

class ServerPlayer extends Player {
	constructor(id: string, position: Matter.Vector, world: World) {
		super(id, position, world)

		this.isServerControlled = true
	}

	update(): void {
		this.processAliveState()
		this.processRotate()
		this.processDash()
		this.forward()
	}

	setServerControlled(state: boolean): void {
		return
	}
}

export default ServerPlayer

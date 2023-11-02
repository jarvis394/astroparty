import { Player, PlayerConstructorProps, World } from '@astroparty/engine'

class ServerPlayer extends Player {
	constructor(props: PlayerConstructorProps) {
		super(props)

		this.isServerControlled = true
	}

	update(): void {
		this.processRotate()
		this.processDash()
		this.forward()
	}

	setServerControlled(state: boolean): void {
		return
	}
}

export default ServerPlayer

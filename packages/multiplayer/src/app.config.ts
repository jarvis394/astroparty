import config from '@colyseus/tools'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import { uWebSocketsTransport } from '@colyseus/uwebsockets-transport'
import { GameRoom } from './rooms/game/game.room'

export default config({
	initializeTransport: function () {
		return new uWebSocketsTransport()
	},

	initializeGameServer: (gameServer) => {
		gameServer.define('game', GameRoom)
	},

	initializeExpress: (app) => {
		if (process.env.NODE_ENV !== 'production') {
			app.use('/', playground)
		}

		app.use('/monitor', monitor())
	},

	beforeListen: () => {
		/**
		 * Before gameServer.listen() is called.
		 */
	},
})

import { AliveState, Player } from '@astroparty/engine'
import { Schema, type, MapSchema } from '@colyseus/schema'

export class SchemaVector extends Schema {
  @type('float64') x: number
  @type('float64') y: number

  constructor(x: number, y: number) {
    super()
    this.x = x
    this.y = y
  }
}

export class SchemaPlayer extends Schema {
  @type('string') id: string
  @type('int64') bullets: number = Player.BULLETS_AMOUNT
  @type('int64') angle = 0
  @type('int8') aliveState: AliveState = AliveState.ALIVE
  @type(SchemaVector) position: SchemaVector

  constructor(id: string, position: SchemaVector) {
    super()
    this.id = id
    this.position = position
  }
}

export class SchemaBullet extends Schema {
  @type('string') id: string
  @type('string') playerId: string
  @type(SchemaVector) position: SchemaVector

  constructor(id: string, playerId: string, position: SchemaVector) {
    super()
    this.id = id
    this.playerId = playerId
    this.position = position
  }
}

export class GameRoomState extends Schema {
  @type('int64') frame = 0
  @type('int32') timestamp = Date.now()
  @type({ map: SchemaPlayer }) players: MapSchema<SchemaPlayer, string> =
    new MapSchema()
  @type({ map: SchemaBullet }) bullets: MapSchema<SchemaBullet, string> =
    new MapSchema()
}

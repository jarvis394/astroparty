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

type SchemaPlayerConstructorProps = {
  id: string
  position: SchemaVector
  velocity?: SchemaVector
  angularVelocity?: number
}
export class SchemaPlayer extends Schema {
  @type('string') id: string
  @type('int64') bullets: number = Player.BULLETS_AMOUNT
  @type('int8') aliveState: AliveState = AliveState.ALIVE
  @type('int64') angle = 0
  @type('int64') angularVelocity
  @type(SchemaVector) velocity
  @type(SchemaVector) position: SchemaVector

  constructor({
    id,
    position,
    velocity = new SchemaVector(0, 0),
    angularVelocity = 0,
  }: SchemaPlayerConstructorProps) {
    super()
    this.id = id
    this.position = position
    this.velocity = velocity
    this.angularVelocity = angularVelocity
  }
}

export class SchemaBullet extends Schema {
  @type('string') id: string
  @type('string') playerId: string
  @type(SchemaVector) position: SchemaVector
  @type(SchemaVector) velocity = new SchemaVector(0, 0)

  constructor(id: string, playerId: string, position: SchemaVector) {
    super()
    this.id = id
    this.playerId = playerId
    this.position = position
  }
}

export class GameRoomState extends Schema {
  @type('int64') frame = 0
  @type('int64') time = 0
  @type({ map: SchemaPlayer }) players: MapSchema<SchemaPlayer, string> =
    new MapSchema()
  @type({ map: SchemaBullet }) bullets: MapSchema<SchemaBullet, string> =
    new MapSchema()
}

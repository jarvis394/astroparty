import { EventEmitter as Emitter } from 'events'
import TypedEmitter, { EventMap } from 'typed-emitter'

class EventEmitter<T extends EventMap> {
  eventEmitter = new Emitter() as TypedEmitter<T>

  public addEventListener<K extends string>(type: K, listener: T[K]) {
    this.eventEmitter.addListener(type, listener)
  }

  public removeEventListener<K extends string>(type: K, listener: T[K]) {
    this.eventEmitter.removeListener(type, listener)
  }
}

export default EventEmitter

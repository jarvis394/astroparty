import Matter from 'matter-js'
import Player from './Player'
import World from './World'
import Loop from 'mainloop.js'

class Game {
  world: World
  private players: Map<string, Player> = new Map()

  constructor({ matterEngine }: { matterEngine: Matter.Engine }) {
    this.world = new World({ matterEngine })
  }

  public createPlayer(): Player {
    const spawnPositions = [
      Matter.Vector.create(100, 100),
      Matter.Vector.create(World.WORLD_WIDTH - 100, World.WORLD_HEIGHT - 100),
      Matter.Vector.create(World.WORLD_WIDTH - 100, 100),
      Matter.Vector.create(100, World.WORLD_HEIGHT - 100),
    ]

    return new Player(
      (this.players.size + 1).toString(),
      spawnPositions[this.players.size % spawnPositions.length],
      this.world
    )
  }

  public addPlayer(player: Player) {
    this.players.set(player.id, player)
  }

  public getPlayerByID(id: string) {
    return this.players.get(id)
  }

  public doesPlayerExistByID(id: string) {
    return this.players.has(id)
  }

  public getAllPlayersIterator(): IterableIterator<Player> {
    return this.players.values()
  }

  public update(delta: number) {
    const interpolation = delta / (1000 / Loop.getFPS())

    for (const player of this.getAllPlayersIterator()) {
      player.update(interpolation)
    }
  }
}

export default Game

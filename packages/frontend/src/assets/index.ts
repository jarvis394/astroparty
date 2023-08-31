import { ShipSprite } from '@astroparty/shared/types/ShipSprite'
import shipBlue from 'src/assets/ship/blue.png'
import shipRed from 'src/assets/ship/red.png'
import shipGreen from 'src/assets/ship/green.png'
import shipPurple from 'src/assets/ship/pruple.png'
import bullet from 'src/assets/bullet.png'
import { Assets } from 'pixi.js'

export const shipSprites: Record<ShipSprite, string> = {
  [ShipSprite.BLUE]: shipBlue,
  [ShipSprite.RED]: shipRed,
  [ShipSprite.GREEN]: shipGreen,
  [ShipSprite.PURPLE]: shipPurple,
}

const addToAssets = (sprites: Record<string, string>, keys: string[]) => {
  Object.entries(sprites).forEach(([key, value]) => {
    Assets.add(key, value)
    keys.push(key)
  })
}

export const loadAssets = async () => {
  const keys: string[] = []

  addToAssets(shipSprites, keys)
  addToAssets({ bullet }, keys)

  return await Assets.load(keys)
}

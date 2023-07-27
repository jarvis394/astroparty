import { useEffect, useState } from 'react'
import { Assets, Cache, ProgressCallback } from 'pixi.js'

const useLoadAsset = <T>(
  key: string,
  onProgress?: ProgressCallback
): T | undefined => {
  const [asset, setAsset] = useState<T>()

  useEffect(() => {
    const loadAsset = async () => {
      if (Cache.has(key)) {
        return setAsset(Cache.get(key))
      }

      const loadedAsset = await Assets.load<T>(key, onProgress)

      setAsset(loadedAsset)
    }

    loadAsset()
  }, [key, onProgress])

  return asset
}

export default useLoadAsset

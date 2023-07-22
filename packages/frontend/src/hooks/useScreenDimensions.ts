import { useEffect, useState } from 'react'

export interface ScreenDimensions {
  width: number
  height: number
}

const useScreenDimensions = (): ScreenDimensions => {
  const [screenDimensions, setScreenDimensions] = useState<ScreenDimensions>({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  const handleResize = () => {
    setScreenDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    })
  }

  useEffect(() => {
    handleResize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return screenDimensions
}

export default useScreenDimensions

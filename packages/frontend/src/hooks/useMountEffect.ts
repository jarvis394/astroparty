import React, { useEffect } from 'react'

const useMountEffect = (fn: React.EffectCallback) => {
  useEffect(() => {
    return fn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default useMountEffect

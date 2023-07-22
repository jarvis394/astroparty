import { Engine, Runner, IEngineDefinition } from 'matter-js'
import React, { createContext, useContext } from 'react'

const engineSettings: IEngineDefinition = { gravity: { x: 0, y: 0 } }

const initialValue: MatterEngineContextType = {
  engine: Engine.create(engineSettings),
  runner: Runner.create({
    isFixed: true,
  }),
}

type MatterEngineContextType = {
  engine: Engine
  runner: Runner
}

const MatterEngineContext = createContext<MatterEngineContextType>(initialValue)

export const MatterEngine: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <MatterEngineContext.Provider value={initialValue}>
      {children}
    </MatterEngineContext.Provider>
  )
}

export const useMatter = (): MatterEngineContextType => {
  const context = useContext(MatterEngineContext)
  return context
}

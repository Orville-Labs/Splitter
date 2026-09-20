import { createContext, useContext } from 'react'

export interface ActiveSpaceContextValue {
  /** null until the spaces query has resolved and a space has been picked. */
  activeSpaceId: string | null
  setActiveSpaceId: (id: string) => void
}

export const ActiveSpaceContext = createContext<ActiveSpaceContextValue | undefined>(undefined)

export function useActiveSpaceId(): ActiveSpaceContextValue {
  const value = useContext(ActiveSpaceContext)
  if (!value) throw new Error('useActiveSpaceId must be used within an ActiveSpaceProvider')
  return value
}

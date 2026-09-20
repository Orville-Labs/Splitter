import { useState, type ReactNode } from 'react'

import { ACTIVE_SPACE_STORAGE_KEY } from '@/config/constants'

import { ActiveSpaceContext } from './ActiveSpaceContext'

function readStored(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SPACE_STORAGE_KEY)
  } catch {
    return null // private browsing — the preference just won't persist
  }
}

function writeStored(id: string) {
  try {
    localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

/**
 * Holds only the *raw* stored id — resolving it against the actual list
 * of spaces (falling back to the first one if the stored id no longer
 * exists, or if there is no stored id yet) is `useSpaces`'s job, not
 * this provider's. Keeping this dumb mirrors the SessionProvider split:
 * a Context should hold state, not derive it.
 */
export function ActiveSpaceProvider({ children }: { children: ReactNode }) {
  const [activeSpaceId, setActiveSpaceIdState] = useState<string | null>(readStored)

  function setActiveSpaceId(id: string) {
    setActiveSpaceIdState(id)
    writeStored(id)
  }

  return (
    <ActiveSpaceContext.Provider value={{ activeSpaceId, setActiveSpaceId }}>
      {children}
    </ActiveSpaceContext.Provider>
  )
}

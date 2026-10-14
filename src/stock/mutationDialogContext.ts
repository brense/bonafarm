import { createContext, useContext } from 'react'

export interface MutationPreset {
  feedId: string
  direction: 'out' | 'in'
  amount: number
  /** Storage the tap happened on: the source for 'out', the target for 'in'. */
  storageId: string
}

/** Opens the change dialog, optionally pre-filled from a tap. */
export const MutationDialogContext = createContext<(preset?: MutationPreset) => void>(() => {})

export function useMutationDialog() {
  return useContext(MutationDialogContext)
}

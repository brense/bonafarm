import { useCallback, useEffect, useRef, useState } from 'react'

export const COMMIT_DELAY_MS = 1500

/**
 * Collects signed changes per storage and hands them to `commit` in one go once
 * no new change came in for `delayMs`. Pending changes are flushed on unmount.
 */
export function usePendingChanges(
  commit: (changes: Map<string, number>) => void,
  delayMs = COMMIT_DELAY_MS,
): { pending: ReadonlyMap<string, number>; add: (storageId: string, delta: number) => void } {
  const [pending, setPending] = useState<ReadonlyMap<string, number>>(new Map())
  const pendingRef = useRef<Map<string, number>>(new Map())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commitRef = useRef(commit)

  useEffect(() => {
    commitRef.current = commit
  })

  const flush = useCallback(() => {
    timer.current = null
    const changes = pendingRef.current
    pendingRef.current = new Map()
    setPending(new Map())
    if (changes.size > 0) commitRef.current(changes)
  }, [])

  const add = useCallback(
    (storageId: string, delta: number) => {
      const next = new Map(pendingRef.current)
      const sum = Math.round(((next.get(storageId) ?? 0) + delta) * 100) / 100
      if (sum === 0) next.delete(storageId)
      else next.set(storageId, sum)
      pendingRef.current = next
      setPending(next)
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = setTimeout(flush, delayMs)
    },
    [flush, delayMs],
  )

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = null
      const changes = pendingRef.current
      pendingRef.current = new Map()
      if (changes.size > 0) commitRef.current(changes)
    },
    [],
  )

  return { pending, add }
}

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePendingChanges } from './usePendingChanges.ts'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('usePendingChanges', () => {
  it('merges taps and commits once', () => {
    const commit = vi.fn()
    const { result } = renderHook(() => usePendingChanges(commit, 1000))
    act(() => result.current.add('a', -1))
    act(() => result.current.add('a', -1))
    expect(result.current.pending.get('a')).toBe(-2)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith(new Map([['a', -2]]))
    expect(result.current.pending.size).toBe(0)
  })

  it('does not commit when changes cancel out', () => {
    const commit = vi.fn()
    const { result } = renderHook(() => usePendingChanges(commit, 1000))
    act(() => result.current.add('a', 1))
    act(() => result.current.add('a', -1))
    expect(result.current.pending.size).toBe(0)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(commit).not.toHaveBeenCalled()
  })

  it('flushes on unmount', () => {
    const commit = vi.fn()
    const { result, unmount } = renderHook(() => usePendingChanges(commit, 1000))
    act(() => result.current.add('a', 1))
    unmount()
    expect(commit).toHaveBeenCalledWith(new Map([['a', 1]]))
  })
})

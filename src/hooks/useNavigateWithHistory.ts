import { useCallback } from 'react'
import { useNavigate, useLocation, NavigateFunction, NavigateOptions, To } from 'react-router-dom'

export default function useNavigateWithHistory() {
  const { state, pathname } = useLocation() as { state?: { refs?: string[] }, pathname: string }
  const _navigate = useNavigate()

  const navigate: NavigateFunction = useCallback((...params) => {
    const [_to, options = {}] = params as [number | To, NavigateOptions]
    if (typeof _to === 'number' && state?.refs) {
      const to = state.refs.splice(_to, Math.abs(_to))[0]
      _navigate(to || '/', { state })
    } else if (typeof _to === 'number') {
      _navigate(_to)
    } else {
      _navigate(_to, { ...options, state: { ...options.state, refs: [...state?.refs || [], pathname] } })
    }
  }, [_navigate, state, pathname])

  return navigate
}

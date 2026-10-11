import { useContext } from 'react'
import { OrgDataContext } from './dataContext.ts'

export function useOrgData() {
  return useContext(OrgDataContext)
}

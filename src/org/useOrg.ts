import { useContext } from 'react'
import { OrgContext } from './context.ts'

export function useOrg() {
  return useContext(OrgContext)
}

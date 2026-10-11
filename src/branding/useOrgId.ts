import { useState } from 'react'
import { ORG_ID_PATTERN } from './manifest.ts'

const STORAGE_KEY = 'orgId'

function valid(value: string | null): value is string {
  return value !== null && ORG_ID_PATTERN.test(value)
}

/** Organisation id from `?org=`, remembered in localStorage, else the remembered one, else null. */
export function getOrgId(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('org')
  if (valid(fromUrl)) {
    try {
      localStorage.setItem(STORAGE_KEY, fromUrl)
    } catch {
      // storage unavailable: still use the id for this session
    }
    return fromUrl
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return valid(stored) ? stored : null
  } catch {
    return null
  }
}

/** Remember an organisation found through the user's memberships for the next start. */
export function rememberOrgId(orgId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, orgId)
  } catch {
    // storage unavailable
  }
}

export function useOrgId(): string | null {
  const [orgId] = useState(getOrgId)
  return orgId
}

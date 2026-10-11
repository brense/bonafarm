import { describe, expect, it } from 'vitest'
import { can, canEditCatalogue, visibleTabs } from './roles.ts'

describe('visibleTabs', () => {
  it('shows stock and storages to every member', () => {
    expect(visibleTabs(['view'])).toEqual(['voorraad', 'opslagen'])
    expect(visibleTabs([])).toEqual(['voorraad', 'opslagen'])
    expect(visibleTabs(['owner'])).toEqual(['voorraad', 'opslagen'])
  })
})

describe('can', () => {
  it('matches the role itself or an all-access role', () => {
    expect(can(['feed'], 'feed')).toBe(true)
    expect(can(['feed'], 'deliver')).toBe(false)
    expect(can(['admin'], 'deliver')).toBe(true)
    expect(can([], 'view')).toBe(false)
  })
})

describe('canEditCatalogue', () => {
  it('follows the rules: deliver, feed, admin, owner', () => {
    expect(canEditCatalogue(['view'])).toBe(false)
    expect(canEditCatalogue(['order'])).toBe(false)
    expect(canEditCatalogue(['feed'])).toBe(true)
    expect(canEditCatalogue(['deliver'])).toBe(true)
    expect(canEditCatalogue(['admin'])).toBe(true)
  })
})

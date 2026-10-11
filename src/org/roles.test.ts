import { describe, expect, it } from 'vitest'
import { can, visibleTabs } from './roles.ts'

describe('visibleTabs', () => {
  it('shows only stock to viewers and orderers', () => {
    expect(visibleTabs(['view'])).toEqual(['voorraad'])
    expect(visibleTabs(['order'])).toEqual(['voorraad'])
  })
  it('adds the use-case tabs per role, in nav order', () => {
    expect(visibleTabs(['deliver'])).toEqual(['voorraad', 'levering'])
    expect(visibleTabs(['feed'])).toEqual(['voorraad', 'muteren'])
    expect(visibleTabs(['feed', 'deliver'])).toEqual(['voorraad', 'levering', 'muteren'])
  })
  it('gives owners and admins everything', () => {
    expect(visibleTabs(['owner'])).toEqual(['voorraad', 'levering', 'muteren'])
    expect(visibleTabs(['admin'])).toEqual(['voorraad', 'levering', 'muteren'])
  })
  it('shows nothing extra without roles', () => {
    expect(visibleTabs([])).toEqual(['voorraad'])
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

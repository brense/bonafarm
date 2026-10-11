import type { MemberRole } from '../model/types.ts'

/** Top-level sections of the app, one per use case. */
export type Tab = 'voorraad' | 'levering' | 'muteren'

const ALL_ACCESS: MemberRole[] = ['owner', 'admin']

/** Whether the roles unlock a capability. Owners and admins may do everything. */
export function can(roles: readonly MemberRole[], role: MemberRole): boolean {
  return roles.some((r) => r === role || ALL_ACCESS.includes(r))
}

/**
 * Every member may read stock, so Voorraad is always there. Levering needs the
 * deliver role, Muteren the feed role. Order of the result is the nav order.
 */
export function visibleTabs(roles: readonly MemberRole[]): Tab[] {
  const tabs: Tab[] = ['voorraad']
  if (can(roles, 'deliver')) tabs.push('levering')
  if (can(roles, 'feed')) tabs.push('muteren')
  return tabs
}

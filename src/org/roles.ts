import type { MemberRole } from '../model/types.ts'

/** Top-level sections of the app. */
export type Tab = 'stock' | 'storages'

const ALL_ACCESS: MemberRole[] = ['owner', 'admin']

/** Whether the roles unlock a capability. Owners and admins may do everything. */
export function can(roles: readonly MemberRole[], role: MemberRole): boolean {
  return roles.some((r) => r === role || ALL_ACCESS.includes(r))
}

/** Every member may read stock and storages; what they may change is gated per action. */
export function visibleTabs(_roles: readonly MemberRole[]): Tab[] {
  return ['stock', 'storages']
}

/** May change feeds, storages and groups (mirrors `canEdit` in firestore.rules). */
export function canEditCatalogue(roles: readonly MemberRole[]): boolean {
  return can(roles, 'deliver') || can(roles, 'feed')
}

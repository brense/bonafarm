/** Firestore path helpers. Keep collection names in one place. */
export const paths = {
  organisations: () => 'organisations',
  organisation: (orgId: string) => `organisations/${orgId}`,
  branding: (orgId: string) => `organisations/${orgId}/branding/public`,
  members: (orgId: string) => `organisations/${orgId}/members`,
  member: (orgId: string, uid: string) => `organisations/${orgId}/members/${uid}`,
  feeds: (orgId: string) => `organisations/${orgId}/feeds`,
  feed: (orgId: string, feedId: string) => `organisations/${orgId}/feeds/${feedId}`,
  logs: (orgId: string) => `organisations/${orgId}/logs`,
  storageTypes: (orgId: string) => `organisations/${orgId}/storageTypes`,
  storageGroups: (orgId: string) => `organisations/${orgId}/storageGroups`,
  storageGroup: (orgId: string, groupId: string) => `organisations/${orgId}/storageGroups/${groupId}`,
  storages: (orgId: string) => `organisations/${orgId}/storages`,
  storage: (orgId: string, storageId: string) => `organisations/${orgId}/storages/${storageId}`,
  items: (orgId: string, storageId: string) => `organisations/${orgId}/storages/${storageId}/items`,
  item: (orgId: string, storageId: string, feedId: string) =>
    `organisations/${orgId}/storages/${storageId}/items/${feedId}`,
} as const

/** Seeded document ids. */
export const seeds = {
  storageTypes: ['bin', 'shute', 'stable'],
  storageGroups: ['ungrouped'],
} as const

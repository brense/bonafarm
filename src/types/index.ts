export type Log = {
  id: string
  type: 'mutation' | 'emptied' | 'emptying'
  timestamp: Date,
  storageId: string
}

export type MutationLog = Log & {
  feedId: string
  amount: number
}

export function isMutationLog(logItem: Log | MutationLog): logItem is MutationLog {
  return logItem.type === 'mutation'
}

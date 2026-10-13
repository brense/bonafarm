import type { LogType } from '../model/types.ts'

export const LOG_LABEL: Record<LogType, string> = {
  delivery: 'geleverd',
  count: 'geteld',
  dispense: 'eruit',
  fill: 'in de koker',
  empty: 'koker leeg',
  move: 'verplaatst',
  correction: 'correctie',
}

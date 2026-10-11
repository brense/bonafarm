export interface StockRow {
  name: string
  stock: number
  unit: 'zak' | 'baal'
  ratePerWeek?: number | null
  status?: string | null
  orderQty?: number | null
}

const numberFormat = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 })

function num(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? '' : numberFormat.format(value)
}

function text(value: string | null | undefined): string {
  return (value ?? '').replace(/[\t\r\n]+/g, ' ').trim()
}

export function stockToTsv(rows: StockRow[], withAdvice: boolean): string {
  const header = ['Voer', 'Voorraad', 'Eenheid']
  if (withAdvice) header.push('Verbruik per week', 'Status', 'Bestellen')
  const lines = [header.join('\t')]
  for (const row of rows) {
    const cells = [text(row.name), num(row.stock), row.unit]
    if (withAdvice) cells.push(num(row.ratePerWeek), text(row.status), num(row.orderQty))
    lines.push(cells.join('\t'))
  }
  return lines.join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

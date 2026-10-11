import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText, stockToTsv, type StockRow } from './excel'

describe('stockToTsv', () => {
  const rows: StockRow[] = [
    { name: 'Hooi', stock: 7.5, unit: 'baal', ratePerWeek: 1.25, status: 'Bestellen', orderQty: 2 },
    { name: 'Brok\tgroot\nnieuw', stock: 2, unit: 'zak', ratePerWeek: null, status: null },
  ]

  it('writes a basic table', () => {
    expect(stockToTsv(rows, false)).toBe(
      'Voer\tVoorraad\tEenheid\nHooi\t7,5\tbaal\nBrok groot nieuw\t2\tzak',
    )
  })

  it('adds advice columns and leaves missing values empty', () => {
    expect(stockToTsv(rows, true)).toBe(
      'Voer\tVoorraad\tEenheid\tVerbruik per week\tStatus\tBestellen\n' +
        'Hooi\t7,5\tbaal\t1,3\tBestellen\t2\n' +
        'Brok groot nieuw\t2\tzak\t\t\t',
    )
  })

  it('returns only the header for no rows', () => {
    expect(stockToTsv([], false)).toBe('Voer\tVoorraad\tEenheid')
  })
})

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes to the clipboard and resolves true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('abc')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('abc')
  })

  it('resolves false on error', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } })
    expect(await copyText('abc')).toBe(false)
  })

  it('resolves false when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    expect(await copyText('abc')).toBe(false)
  })
})

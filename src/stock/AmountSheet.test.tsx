import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AmountSheet, { type AmountMode, type AmountSheetProps } from './AmountSheet.tsx'

afterEach(cleanup)

function setup(over: Partial<AmountSheetProps> = {}) {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(
    <AmountSheet
      open
      mode="dispense"
      feedName="Hooi"
      storageName="Geitenstal"
      unit="baal"
      initial={2.5}
      onConfirm={onConfirm}
      onClose={onClose}
      {...over}
    />,
  )
  return { onConfirm, onClose }
}

const plus = () => fireEvent.click(screen.getByRole('button', { name: 'Meer' }))
const minus = () => fireEvent.click(screen.getByRole('button', { name: 'Minder' }))

describe('AmountSheet', () => {
  it('renders header and readout', () => {
    setup()
    expect(screen.getByText('Hooi')).toBeTruthy()
    expect(screen.getByText(/Geitenstal/)).toBeTruthy()
    expect(screen.getByText('2,5 balen')).toBeTruthy()
  })

  it('steps by 0.5 and dispense never goes below 0.5', () => {
    setup({ initial: 1 })
    plus()
    expect(screen.getByText('1,5 balen')).toBeTruthy()
    minus()
    minus()
    expect(screen.getByText('0,5 balen')).toBeTruthy()
    minus()
    expect(screen.getByText('0,5 balen')).toBeTruthy()
  })

  it('preset sets the amount', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getByText('5 balen')).toBeTruthy()
  })

  it.each<[AmountMode, string]>([
    ['dispense', 'Eruit halen'],
    ['count', 'Opslaan'],
    ['fill', 'Vullen'],
  ])('confirm label and callback in %s mode', (mode, label) => {
    const { onConfirm } = setup({ mode, initial: 3 })
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(3)
  })

  it('shows current stock in count mode', () => {
    setup({ mode: 'count', initial: 10, current: 10 })
    expect(screen.getByText('nu 10 balen')).toBeTruthy()
  })

  it('warns when dispensing more than current', () => {
    setup({ initial: 3, current: 2 })
    expect(screen.getByText('meer dan de 2 die er staan')).toBeTruthy()
  })
})

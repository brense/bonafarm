import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SearchList } from './SearchList.tsx'

afterEach(cleanup)

const items = ['Hooi', 'Stro', 'Geit', 'Kalf', 'Paard', 'Schaap', 'Stier']

function setup(props: { searchPosition?: 'bottom' | 'top'; items?: string[] } = {}) {
  render(
    <SearchList
      items={props.items ?? items}
      getKey={(i) => i}
      getLabel={(i) => i}
      renderRow={(i) => <span>{i}</span>}
      searchLabel="Zoeken…"
      listAriaLabel="Lijst"
      emptyText="Niets"
      searchPosition={props.searchPosition}
    />,
  )
}

const rows = () => within(screen.getByRole('list', { name: 'Lijst' })).getAllByRole('listitem').map((r) => r.textContent)

describe('SearchList', () => {
  it('shows the first 5 items as given when the query is empty', () => {
    setup()
    expect(rows()).toEqual(['Hooi', 'Stro', 'Geit', 'Kalf', 'Paard'])
  })

  it('filters case-insensitively and caps matches', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Zoeken…'), { target: { value: 'ST' } })
    expect(rows()).toEqual(['Stro', 'Stier'])
  })

  it('shows the empty text without matches', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Zoeken…'), { target: { value: 'zzz' } })
    expect(screen.getByText('Niets')).toBeTruthy()
  })

  it('puts the search field below or above the list', () => {
    setup()
    const list = screen.getByRole('list', { name: 'Lijst' })
    const field = screen.getByLabelText('Zoeken…')
    expect(list.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    cleanup()
    setup({ searchPosition: 'top' })
    expect(screen.getByRole('list', { name: 'Lijst' }).compareDocumentPosition(screen.getByLabelText('Zoeken…')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })
})

import { Box, List, TextField, Typography } from '@mui/material'
import { Fragment, useState, type ReactNode, type Ref } from 'react'

interface Props<T> {
  /** Caller sorts: most relevant first. */
  items: T[]
  getKey: (item: T) => string
  /** Text matched against the query (case-insensitive, nl locale). */
  getLabel: (item: T) => string
  renderRow: (item: T) => ReactNode
  max?: number
  searchLabel: string
  searchPosition?: 'bottom' | 'top'
  listAriaLabel: string
  emptyText?: string
  /** Controlled query; omit to let the list keep its own. */
  query?: string
  onQueryChange?: (query: string) => void
  inputRef?: Ref<HTMLInputElement>
}

/** A short list (first `max` items, or first `max` matches) with a plain search field. */
export function SearchList<T>({
  items,
  getKey,
  getLabel,
  renderRow,
  max = 5,
  searchLabel,
  searchPosition = 'bottom',
  listAriaLabel,
  emptyText,
  query,
  onQueryChange,
  inputRef,
}: Props<T>) {
  const [own, setOwn] = useState('')
  const value = query ?? own
  const needle = value.trim().toLocaleLowerCase('nl')
  const shown = (needle ? items.filter((i) => getLabel(i).toLocaleLowerCase('nl').includes(needle)) : items).slice(0, max)
  const field = (
    <TextField
      label={searchLabel}
      type="search"
      variant="filled"
      fullWidth
      value={value}
      onChange={(e) => (onQueryChange ?? setOwn)(e.target.value)}
      inputRef={inputRef}
      sx={searchPosition === 'bottom' ? { mt: 1 } : { mb: 1 }}
    />
  )
  return (
    <Box>
      {searchPosition === 'top' && field}
      <List aria-label={listAriaLabel} disablePadding>
        {shown.map((item) => (
          <Fragment key={getKey(item)}>{renderRow(item)}</Fragment>
        ))}
      </List>
      {shown.length === 0 && emptyText && (
        <Typography color="text.secondary" sx={{ py: 1 }}>
          {emptyText}
        </Typography>
      )}
      {searchPosition === 'bottom' && field}
    </Box>
  )
}

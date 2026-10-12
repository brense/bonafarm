import SearchIcon from '@mui/icons-material/Search'
import { Divider, InputAdornment, List, ListItem, Paper, TextField, Typography } from '@mui/material'
import { lighten, type Theme } from '@mui/material/styles'
import { useState, type ReactNode, type Ref } from 'react'

interface Props<T> {
  /** Caller sorts: most relevant first. */
  items: T[]
  getKey: (item: T) => string
  /** Text matched against the query (case-insensitive, nl locale). */
  getLabel: (item: T) => string
  /** Pinned items are always shown first, whatever the query. */
  isPinned?: (item: T) => boolean
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
  isPinned,
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
  const pinned = isPinned ? items.filter(isPinned) : []
  const others = items.filter((i) => !pinned.includes(i))
  const matches = needle ? others.filter((i) => getLabel(i).toLocaleLowerCase('nl').includes(needle)) : others
  const shown = [...pinned, ...matches.slice(0, Math.max(1, max - pinned.length))]
  const field = (
    <TextField
      type="search"
      variant="standard"
      fullWidth
      placeholder={searchLabel}
      value={value}
      onChange={(e) => (onQueryChange ?? setOwn)(e.target.value)}
      inputRef={inputRef}
      slotProps={{
        htmlInput: { 'aria-label': searchLabel },
        input: {
          disableUnderline: true,
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        },
      }}
      sx={{ '& .MuiInputBase-root': { height: 56, px: 2 } }}
    />
  )
  return (
    <CardSurface>
      {searchPosition === 'top' && (
        <>
          {field}
          <Divider />
        </>
      )}
      <List aria-label={listAriaLabel} disablePadding sx={{ overflow: 'hidden', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {shown.map((item) => (
          <ListItem key={getKey(item)} divider disableGutters disablePadding>
            {renderRow(item)}
          </ListItem>
        ))}
      </List>
      {shown.length === 0 && emptyText && (
        <Typography color="text.secondary" sx={{ px: 2, py: 1 }}>
          {emptyText}
        </Typography>
      )}
      {searchPosition === 'bottom' && (
        <>
          <Divider />
          {field}
        </>
      )}
    </CardSurface>
  )
}

/** The raised, outlined card every question and the feed search sits on. Rows inside use var(--row-surface). */
export function CardSurface({ children }: { children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        // Opaque raised surface; rows use the same colour via var(--row-surface) so swiped rows match the card.
        '--row-surface': (t: Theme) => (t.palette.mode === 'dark' ? lighten(t.palette.background.default, 0.08) : t.palette.grey[50]),
        bgcolor: 'var(--row-surface)',
        backgroundImage: 'none',
      }}
    >
      {children}
    </Paper>
  )
}

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { Storage } from '../model/types.ts'
import { canEditCatalogue } from '../org/roles.ts'
import { useOrg } from '../org/useOrg.ts'
import { useOrgData } from '../org/useOrgData.ts'
import { formatAmount } from '../stock/stock.ts'
import {
  applyCatalogue,
  planMoveToGroup,
  planNewGroup,
  planRenameGroup,
  planReorderGroups,
  planReorderStorages,
  type OrderWrite,
} from '../storage/catalogue.ts'
import StorageAvatar from '../storage/StorageAvatar.tsx'
import Page from './Page.tsx'

const UNGROUPED = 'ungrouped'

interface Group {
  id: string
  name: string
  order: number
  storages: Array<Storage & { id: string }>
}

/** Drag handle plus the row; dnd-kit transforms the wrapper. */
function Sortable({ id, disabled, children }: { id: string; disabled?: boolean; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: 'relative',
    zIndex: isDragging ? 1 : undefined,
  }
  const handle = disabled ? (
    <Box sx={{ width: 40 }} />
  ) : (
    <IconButton
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Versleep"
      size="large"
      sx={{ touchAction: 'none', cursor: 'grab', mr: 0.5 }}
    >
      <DragIndicatorIcon />
    </IconButton>
  )
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  )
}

/** Grouped storages with their contents; in edit mode groups and storages can be reordered and regrouped. */
export default function StoragesPage() {
  const { orgId, roles } = useOrg()
  const { storages, storageTypes, storageGroups, feeds, items, loading } = useOrgData()
  const navigate = useNavigate()
  const mayEdit = canEditCatalogue(roles)
  const [editing, setEditing] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; storageId?: string; groupId?: string } | null>(null)
  const [moving, setMoving] = useState<string | null>(null) // storage id being moved to another group
  const [naming, setNaming] = useState<{ groupId?: string; forStorage?: string; name: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const groups = useMemo<Group[]>(() => {
    const byGroup = new Map<string, Group>()
    for (const [id, g] of storageGroups) byGroup.set(id, { id, name: g.name, order: g.order, storages: [] })
    for (const [id, s] of storages) {
      if (s.status !== 'active') continue
      const group = byGroup.get(s.groupId) ?? { id: s.groupId, name: s.groupId, order: 999, storages: [] }
      group.storages.push({ ...s, id })
      byGroup.set(s.groupId, group)
    }
    for (const g of byGroup.values()) g.storages.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'nl'))
    // "Niet gegroepeerd" is pinned last and never dragged.
    return [...byGroup.values()].sort((a, b) => (a.id === UNGROUPED ? 1 : b.id === UNGROUPED ? -1 : a.order - b.order))
  }, [storages, storageGroups])

  const summary = (storageId: string, typeId: string): string => {
    if (storageTypes.get(typeId)?.behaviour === 'consumed') {
      const linked = [...feeds.values()].filter((f) => f.defaultStorageId === storageId && !f.hidden).map((f) => f.name)
      return linked.length ? linked.join(' · ') : 'Geen voer gekoppeld'
    }
    const parts = [...items.values()]
      .filter((it) => it.storageId === storageId && it.amount > 0)
      .map((it) => `${feeds.get(it.feedId)?.name ?? it.feedId} ${formatAmount(it.amount)}`)
    return parts.length ? parts.join(' · ') : 'Leeg'
  }

  const run = (updates: OrderWrite[], creates: OrderWrite[] = [], done?: string) => {
    applyCatalogue({ updates, creates })
      .then(() => done && setSnack(done))
      .catch((err: { code?: string }) => setSnack(`Niet opgeslagen (${err.code ?? 'fout'})`))
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!orgId || !over || active.id === over.id) return
    const [kind, id] = String(active.id).split(':')
    const [overKind, overId] = String(over.id).split(':')
    if (kind !== overKind) return
    if (kind === 'group') {
      const draggable = groups.filter((g) => g.id !== UNGROUPED)
      const from = draggable.findIndex((g) => g.id === id)
      const to = draggable.findIndex((g) => g.id === overId)
      run(planReorderGroups(orgId, draggable, from, to))
    } else {
      const group = groups.find((g) => g.storages.some((s) => s.id === id))
      if (!group || !group.storages.some((s) => s.id === overId)) return
      const from = group.storages.findIndex((s) => s.id === id)
      const to = group.storages.findIndex((s) => s.id === overId)
      run(planReorderStorages(orgId, group.storages, from, to))
    }
  }

  const moveTo = (storageId: string, groupId: string) => {
    if (!orgId) return
    const target = groups.find((g) => g.id === groupId)
    run([planMoveToGroup(orgId, storageId, groupId, target?.storages ?? [])], [], `${storages.get(storageId)?.name} naar ${target?.name ?? groupId}`)
    setMoving(null)
  }

  const saveName = () => {
    if (!orgId || !naming) return
    const name = naming.name.trim()
    if (!name) return
    if (naming.groupId) {
      run([planRenameGroup(orgId, naming.groupId, name)], [], 'Groep hernoemd')
    } else {
      const { id, write } = planNewGroup(orgId, name, storageGroups.size ? new Map([...storageGroups].map(([k, v]) => [k, { id: k, order: v.order }])) : new Map())
      const updates = naming.forStorage ? [planMoveToGroup(orgId, naming.forStorage, id, [])] : []
      run(updates, [write], `Groep "${name}" gemaakt`)
    }
    setNaming(null)
  }

  const groupIds = groups.filter((g) => g.id !== UNGROUPED).map((g) => `group:${g.id}`)

  const renderStorage = (s: Storage & { id: string }, handle: ReactNode) => (
    <Card variant="outlined">
      {editing ? (
        <Stack direction="row" sx={{ alignItems: 'center', pl: 0.5, pr: 0.5, minHeight: 64 }}>
          {handle}
          <Box sx={{ mr: 1.5 }}>
            <StorageAvatar storage={s} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0, py: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }} noWrap>
              {s.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {summary(s.id, s.typeId)}
            </Typography>
          </Box>
          <IconButton aria-label={`Opties voor ${s.name}`} onClick={(e) => setMenu({ anchor: e.currentTarget, storageId: s.id })}>
            <MoreVertIcon />
          </IconButton>
        </Stack>
      ) : (
        <CardActionArea onClick={() => navigate(`/storages/${s.id}`)} sx={{ minHeight: 64 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <StorageAvatar storage={s} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {s.name}
                  </Typography>
                  <Chip size="small" label={storageTypes.get(s.typeId)?.name ?? s.typeId} />
                </Stack>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {summary(s.id, s.typeId)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      )}
    </Card>
  )

  const renderGroup = (g: Group, handle: ReactNode) => (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', minHeight: 48, mb: 0.5 }}>
        {editing && handle}
        <Typography variant="overline" color="text.secondary" component="h2" sx={{ flexGrow: 1 }}>
          {g.name}
        </Typography>
        {editing && g.id !== UNGROUPED && (
          <IconButton aria-label={`Opties voor groep ${g.name}`} onClick={(e) => setMenu({ anchor: e.currentTarget, groupId: g.id })}>
            <MoreVertIcon />
          </IconButton>
        )}
      </Stack>
      <SortableContext items={g.storages.map((s) => `storage:${s.id}`)} strategy={verticalListSortingStrategy}>
        <Stack spacing={1}>
          {g.storages.length === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ px: 1 }}>
              Geen opslag in deze groep
            </Typography>
          )}
          {g.storages.map((s) => (
            <Sortable key={s.id} id={`storage:${s.id}`} disabled={!editing}>
              {(h) => renderStorage(s, h)}
            </Sortable>
          ))}
        </Stack>
      </SortableContext>
    </Box>
  )

  const menuStorage = menu?.storageId ? storages.get(menu.storageId) : undefined

  return (
    <Page title="Opslagen">
      {mayEdit && !loading && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
          <Button variant={editing ? 'contained' : 'outlined'} onClick={() => setEditing((e) => !e)}>
            {editing ? 'Klaar' : 'Volgorde en groepen'}
          </Button>
          {editing && (
            <Button startIcon={<AddIcon />} onClick={() => setNaming({ name: '' })}>
              Nieuwe groep
            </Button>
          )}
        </Stack>
      )}

      {loading ? (
        <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : groups.length === 0 ? (
        <Typography color="text.secondary">Nog geen opslag in deze organisatie.</Typography>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <Stack spacing={3}>
            <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
              {groups
                .filter((g) => g.id !== UNGROUPED)
                .map((g) => (
                  <Sortable key={g.id} id={`group:${g.id}`} disabled={!editing}>
                    {(h) => renderGroup(g, h)}
                  </Sortable>
                ))}
            </SortableContext>
            {groups
              .filter((g) => g.id === UNGROUPED)
              .map((g) => (
                <Box key={g.id}>{renderGroup(g, <Box sx={{ width: 40 }} />)}</Box>
              ))}
          </Stack>
        </DndContext>
      )}

      <Menu open={menu !== null} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        {menu?.storageId && (
          <MenuItem
            onClick={() => {
              setMoving(menu.storageId!)
              setMenu(null)
            }}
          >
            Naar andere groep…
          </MenuItem>
        )}
        {menu?.groupId && (
          <MenuItem
            onClick={() => {
              setNaming({ groupId: menu.groupId, name: storageGroups.get(menu.groupId!)?.name ?? '' })
              setMenu(null)
            }}
          >
            Hernoemen…
          </MenuItem>
        )}
      </Menu>

      <Dialog open={moving !== null} onClose={() => setMoving(null)} fullWidth>
        <DialogTitle>{menuStorage?.name ?? storages.get(moving ?? '')?.name} naar groep</DialogTitle>
        <List sx={{ pb: 1 }}>
          {groups.map((g) => (
            <ListItemButton
              key={g.id}
              sx={{ minHeight: 56 }}
              selected={storages.get(moving ?? '')?.groupId === g.id}
              onClick={() => moving && moveTo(moving, g.id)}
            >
              <ListItemText primary={g.name} secondary={`${g.storages.length} opslag${g.storages.length === 1 ? '' : 'en'}`} />
            </ListItemButton>
          ))}
          <ListItemButton
            sx={{ minHeight: 56 }}
            onClick={() => {
              setNaming({ forStorage: moving ?? undefined, name: '' })
              setMoving(null)
            }}
          >
            <AddIcon sx={{ mr: 1 }} />
            <ListItemText primary="Nieuwe groep…" />
          </ListItemButton>
        </List>
      </Dialog>

      <Dialog open={naming !== null} onClose={() => setNaming(null)} fullWidth>
        <DialogTitle>{naming?.groupId ? 'Groep hernoemen' : 'Nieuwe groep'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Naam"
            value={naming?.name ?? ''}
            onChange={(e) => setNaming((n) => (n ? { ...n, name: e.target.value } : n))}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNaming(null)}>Annuleren</Button>
          <Button variant="contained" onClick={saveName} disabled={!naming?.name.trim()}>
            Opslaan
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack !== null} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack} />
    </Page>
  )
}

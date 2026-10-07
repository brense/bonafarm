import { Stack, Typography, Icon, Chip, useTheme, useMediaQuery, Table, TableRow, TableCell, TableHead, TableBody, Box, IconButton, Button, TableRowProps } from '@mui/material'
import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, makeCollectionGroupQuery, useFirestore, makeQuery, useDoc } from 'firestore-react-hooks'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { orderBy } from 'firebase/firestore'

type Feed = { name: string, id: string, linkedStorageId?: string, hidden?: boolean }

type Storage = { name: string, type: 'storage' | 'shute' | 'stable', id: string, color?: string }

function useFeeds() {
  const firestore = useFirestore()
  const q = useMemo(() => makeCollectionGroupQuery<{ amount: number }>(firestore, 'items'), [firestore])
  const { subscribe } = useQuery<{ amount: number }>(q)
  const [items, setItems] = useState<Array<{ feedId: string, amount: number, storageId: string }>>([])
  const [storages, setStorages] = useState<Storage[]>([])
  const qFeeds = useMemo(() => makeQuery<Feed>(firestore, 'feeds', orderBy('order')), [firestore])
  const { subscribe: subscribeFeeds } = useQuery<Feed>(qFeeds, { returnDocumentData: true })
  const qStorages = useMemo(() => makeQuery<Storage>(firestore, 'storages'), [firestore])
  const { subscribe: subscribeStorages } = useQuery<Storage>(qStorages, { returnDocumentData: true })
  const [feeds, setFeeds] = useState<Array<Feed & { total: number, storages: Array<Storage & { amount: number }>, linkedStorage?: Storage }>>([])

  useEffect(() => {
    const unsubscribe = subscribeStorages(setStorages)
    return () => unsubscribe()
  }, [subscribeStorages])

  useEffect(() => {
    const unsubscribe = subscribeFeeds(feeds => {
      setFeeds(feeds.filter(f => f.hidden !== true).map(({ linkedStorageId, ...feed }) => {
        const inStorages = items.filter(i => i.feedId === feed.id).map(({ storageId, amount }) => ({ amount, ...storages.find(s => s.id === storageId)! }))
        return { ...feed, linkedStorage: storages.find(s => s.id === linkedStorageId), storages: inStorages, total: inStorages.reduce((t, i) => t += i.amount, 0) }
      }))
    })
    return () => unsubscribe()
  }, [subscribeFeeds, storages, items])

  useEffect(() => {
    const unsubscribe = subscribe(async snapshot => {
      const items: Array<{ feedId: string, amount: number, storageId: string }> = []
      snapshot.forEach(doc => {
        items.push({ feedId: doc.id, amount: doc.data().amount, storageId: doc.ref.parent.parent?.id! })
      })
      setItems(items)
    })
    return () => unsubscribe()
  }, [subscribe])

  return useMemo(() => [feeds, setFeeds] as [typeof feeds, typeof setFeeds], [feeds])
}

function Draggable({ feedId, children, ...props }: React.PropsWithChildren<{ feedId: string } & TableRowProps>) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition
  } = useSortable({
    id: feedId
  })
  const navigate = useNavigate()

  const style: CSSProperties = {
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Translate.toString(transform),
    transition
  }

  return <TableRow key={feedId} hover onClick={() => navigate(`/feed/${feedId}`)} ref={setNodeRef} style={style} {...props}>
    <TableCell padding="none" sx={{ width: '1px' }}>
      <IconButton sx={{ cursor: 'move', color: 'text.secondary' }} disableRipple ref={setActivatorNodeRef} {...attributes} {...listeners}><Icon color="inherit">drag_indicator</Icon></IconButton>
    </TableCell>
    {children}
  </TableRow>
}

export default function StockPerFeed() {
  const [feeds, setFeeds] = useFeeds()
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const mouseSensor = useSensor(MouseSensor)
  const touchSensor = useSensor(TouchSensor)
  const sensors = useSensors(mouseSensor, touchSensor)
  const { updateDoc } = useDoc()

  const handleDragEnd = useCallback(({ over, active }: { over: any, active: any }) => {
    if (over && active.id !== over?.id) {
      const activeIndex = feeds.findIndex(({ id }) => id === active.id)
      const overIndex = feeds.findIndex(({ id }) => id === over.id)
      const newOrder = arrayMove(feeds, activeIndex, overIndex)
      setFeeds(newOrder)
      newOrder.forEach((feed, order) => updateDoc(`feeds/${feed.id}`, { order }))
    }
  }, [feeds, updateDoc, setFeeds])

  return <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
    <SortableContext items={feeds}>
      <Table padding="normal" stickyHeader={true} size={isMobile ? 'small' : 'medium'} sx={{ mb: 8 }}>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Voertype</TableCell>
            <TableCell align="right">Vooraad</TableCell>
            <TableCell colSpan={2}>&nbsp;</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {feeds.map(feed => <Draggable key={feed.id} feedId={feed.id} hover onClick={() => navigate(`/feed/${feed.id}`)}>
            <TableCell sx={{ whiteSpace: 'nowrap', maxWidth: isMobile ? 120 : 'none', textOverflow: 'ellipsis', overflow: 'hidden', pr: 0 }}>{feed.name}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{feed.total.toLocaleString()} stuks</TableCell>
            <TableCell>
              <Stack direction={isMobile ? 'column' : 'row'} spacing={1} flexWrap="wrap">
                {feed.storages.map((storage, k) => <Chip key={k} onClick={(e) => { e.stopPropagation(); navigate(`/stock/${storage.id}`) }} size="small" label={`${storage.name}${storage.type === 'shute' ? '' : ` (${storage.amount.toLocaleString()})`}`} sx={{ bgcolor: storage.color }} />)}
                {feed.linkedStorage && feed.linkedStorage.type === 'shute' && <Chip key={feed.linkedStorage.id} onClick={(e) => { e.stopPropagation(); navigate(`/stock/${feed.linkedStorage?.id}`) }} size="small" label={`${feed.linkedStorage.name}`} sx={{ bgcolor: feed.linkedStorage.color }} />}
              </Stack>
            </TableCell>
            {!isMobile && <TableCell sx={{ width: '1px' }}>
              <Button size="small" sx={{ whiteSpace: 'nowrap' }}><Icon fontSize="small">visibility</Icon>&nbsp;&nbsp; Details</Button>
            </TableCell>}
          </Draggable>)}
          <TableRow hover>
            <TableCell colSpan={5} onClick={() => navigate('/feed/add', { state: { referrer: location.pathname } })} sx={{ cursor: 'pointer' }}>
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                <Icon fontSize="small" color="inherit">add_circle</Icon>&nbsp;
                <Typography color="inherit" variant="subtitle2" component="span">Voertype toevoegen</Typography>
              </Box>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </SortableContext>
  </DndContext>
}

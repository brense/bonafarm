import React, { useMemo, useCallback, CSSProperties, useState, useEffect } from 'react'
import { Card, CardActionArea, Typography, Icon, CardContent, useTheme, useMediaQuery, Grid, IconButton } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import StorageCardWithLogs from '../../components/storage/StorageCardWithLogs'
import StorageCard from '../../components/storage/StorageCard'
import { orderBy } from '../../hooks/firestore'
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useQuery, makeQuery, useFirestore, useDoc } from 'firestore-react-hooks'

function Draggable({ storageId, children }: React.PropsWithChildren<{ storageId: string }>) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition
  } = useSortable({
    id: storageId
  })
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const style: CSSProperties = {
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Translate.toString(transform),
    transition
  }

  return <Grid item xs={12} sm={6} md={4} lg={3} xl={2} ref={setNodeRef} sx={{ position: 'relative' }} style={style}>
    {children}
    {true && <IconButton sx={{ position: 'absolute', top: 16, right: 0, cursor: 'move', color: 'text.secondary' }} disableRipple ref={setActivatorNodeRef} {...attributes} {...listeners}><Icon color="inherit">drag_indicator</Icon></IconButton>}
  </Grid>
}

export default function StockPerStorage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [storages, setStorages] = useState<Array<{ name: string, type: 'storage' | 'shute' | 'stable', id: string, color?: string, status?: 'emptying' }>>([])
  const firestore = useFirestore()
  const q = useMemo(() => makeQuery<{ name: string, type: 'storage' | 'shute' | 'stable', id: string, color?: string }>(firestore, 'storages', orderBy('order')), [firestore])
  const { subscribe } = useQuery<{ name: string, type: 'storage' | 'shute' | 'stable', id: string, color?: string }>(q, { returnDocumentData: true })
  const { updateDoc } = useDoc()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const mouseSensor = useSensor(MouseSensor)
  const touchSensor = useSensor(TouchSensor)
  const sensors = useSensors(mouseSensor, touchSensor)

  useEffect(() => {
    const unsubscribe = subscribe(setStorages)
    return () => unsubscribe()
  }, [subscribe])

  const handleDragEnd = useCallback(({ over, active }: { over: any, active: any }) => {
    if (over && active.id !== over?.id) {
      const activeIndex = storages.findIndex(({ id }) => id === active.id)
      const overIndex = storages.findIndex(({ id }) => id === over.id)
      const newOrder = arrayMove(storages, activeIndex, overIndex)
      setStorages(newOrder)
      newOrder.forEach((storage, order) => updateDoc(`storages/${storage.id}`, { order }))
    }
  }, [storages, updateDoc])

  return <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
    <SortableContext items={storages}>
      <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
        {storages.map(storage => <Draggable key={storage.id} storageId={storage.id}>
          {storage.type === 'shute' ? <StorageCardWithLogs storage={storage} /> : <StorageCard storage={storage} />}
        </Draggable>)}
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <Card>
            <CardActionArea onClick={() => navigate('/stock/add', { state: { referrer: location.pathname } })}>
              <CardContent sx={{ height: !isMobile ? 240 : undefined, overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.secondary' }}>
                <Icon fontSize="large" color="inherit">add_circle</Icon>
                <Typography sx={{ mt: 2 }} color="inherit" variant="subtitle2">Opslag toevoegen</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </SortableContext>
  </DndContext>
}

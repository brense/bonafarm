import { Divider, Grid, BottomNavigation, BottomNavigationAction, Icon, Paper, CircularProgress } from '@mui/material'
import { Timeline } from '@mui/lab'
import { useMemo, useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStoragesQuery, useAddLogMutation, LogType } from '../graphql'
import CenteredContent from '../components/CenteredContent'
import { useAppBarContext } from '../App'
import StorageItem from '../components/StorageItem'
import LogItem from '../components/LogItem'

export default function Storage() {
  const { pathname } = useLocation()
  const { storageId } = useParams<{ storageId: string }>()
  const navigate = useNavigate()
  const { data, loading } = useStoragesQuery({ variables: { storageId }, fetchPolicy: 'no-cache' })
  const [addLog] = useAddLogMutation()
  const storage = useMemo(() => data?.storages ? data.storages[0] : { title: null, items: [], logs: [], canEmpty: false }, [data])
  const [mutating, setMutating] = useState(false)

  useAppBarContext(() => ({ showLogo: false, children: storage?.title }), [storage])

  const handleMoveItem = useCallback((item: any) => {
    navigate(`/stock/${storageId}/add`, { state: { item, wasMoved: true, referer: `/stock/${storageId}` } })
  }, [storageId, navigate])

  const handleMutation = useCallback(async (item: any) => {
    storageId && await addLog({ variables: { item: { storageId, ...item } }, refetchQueries: ['Storages'] })
    if (item.amount < 0) {
      handleMoveItem(item)
    }
  }, [addLog, storageId, handleMoveItem])

  const handleEmpty = useCallback(async () => {
    setMutating(true)
    storageId && await addLog({ variables: { item: { storageId, type: LogType.Emptied } }, refetchQueries: ['Storages'] })
    setMutating(false)
  }, [addLog, storageId])

  return loading ? <CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent> : <>
    {storage.items.length > 0 && <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 2, pl: 2, flex: 1, width: '100%' }}>
      {storage.items.map(item => <Grid key={item.slug} item xs={12} sm={6} md={4} lg={3} xl={2}>
        <StorageItem item={item} onMutateItem={handleMutation} />
      </Grid>)}
    </Grid>}
    {storage.logs.length > 0 && storage.items.length > 0 && <Divider>Laatste wijzigingen</Divider>}
    <Timeline>
      {storage.logs.map(item => <LogItem key={item.id} item={item} />
      )}
    </Timeline>
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation showLabels={true}>
        <BottomNavigationAction onClick={() => navigate(`/stock/${storageId}/add`, { state: { referrer: pathname } })} label="Zak toevoegen" icon={<Icon>add_circle</Icon>} />
        {storage.canEmpty && <BottomNavigationAction onClick={() => handleEmpty()} label="Koker leegmaken" icon={<Icon>cancel</Icon>} disabled={mutating} />}
      </BottomNavigation>
    </Paper>
  </>
}

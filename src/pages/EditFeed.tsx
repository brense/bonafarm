import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Avatar, Box, Button, CardContent, Collapse, DialogActions, DialogContent, Divider, Icon, LinearProgress, List, ListItem, ListItemAvatar, ListItemButton, ListItemSecondaryAction, ListItemText, Slide, Typography, useMediaQuery, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import { Feed, updateFeed, useFeed, useStorages } from '../hooks/firebase'
import FeedForm from '../components/forms/FeedForm'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

const initialState: Feed = {
  name: '',
  id: '',
  linkedStorageId: undefined as string | undefined
}

export default function EditFeed() {
  const [saving, setSaving] = useState(false)
  const match = useMatch('/feed/:feedId/*')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()
  const [changes, setChanges] = useState(initialState)
  const isValid = useMemo(() => !(changes.name === '' || changes.id === '' || saving), [changes, saving])
  const { data: feeds } = useFeed()
  const { data: storages } = useStorages()
  const feed = useMemo(() => feeds.find(f => f.id === match?.params.feedId), [match, feeds])
  const feedStorages = useMemo(() => feed ? storages.filter(s => !s.canEmpty && s.items && s.items[feed.id]).map(({ items, ...s }) => ({ ...s, amount: items ? items[feed.id].amount : 0 })) : [], [feed, storages])
  const totalAmount = useMemo(() => feedStorages.reduce((amount, s) => amount += s.amount, 0), [feedStorages])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])
  const location = useLocation()

  useEffect(() => {
    feed && setChanges(feed)
  }, [feed])

  const handleClose = useCallback(() => {
    setSaving(false)
    setChanges(feed ? feed : initialState)
    navigate(isEditing && feed ? `/feed/${feed.id}` : '/stock')
  }, [navigate, feed, isEditing])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    setSaving(true)
    e.preventDefault()
    const { id, linkedStorageId, ...data } = changes
    await updateFeed(id, linkedStorageId ? { ...data, linkedStorageId } : data)
    handleClose()
  }, [handleClose, changes])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return !feed ? null : <CustomDialog title={!isEditing ? `${feed.name}` : `${feed.name} bewerken`} open={Boolean(match) && match?.params['*'] !== 'add'} TransitionComponent={Transition} keepMounted onClose={handleClose} showCloseButton={!isMobile}>
    <DialogContent sx={{ p: 0 }}>
      <Collapse in={!isEditing}>
        {totalAmount === 0 && <CardContent><Typography>Geen voorraad in tonnen</Typography></CardContent>}
        {totalAmount !== 0 && <List disablePadding>
          {feedStorages.map(s => <ListItem key={s.id} disablePadding>
            <ListItemButton onClick={() => navigate(`/stock/${s.id}`, { state: { referrer: location.pathname } })}>
              <ListItemAvatar><Avatar sx={{ bgcolor: s.color }}>{''}</Avatar></ListItemAvatar>
              <ListItemText primary={s.name} />
              <ListItemSecondaryAction><Typography variant="subtitle2">{s.amount.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
            </ListItemButton>
          </ListItem>)}
          <Divider />
          <ListItem>
            <ListItemText inset primary="Totaal" />
            <ListItemSecondaryAction><Typography variant="subtitle2">{totalAmount.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
          </ListItem>
        </List>}
      </Collapse>
      <Collapse in={isEditing}>
        <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }} onSubmit={handleSubmit}>
          <DialogContent sx={{ flex: 1 }}>
            <FeedForm feed={changes} onChange={setChanges} isEditing />
          </DialogContent>
        </Box>
      </Collapse>
    </DialogContent>
    {!isEditing ? <DialogActions>
      <Button onClick={() => navigate(`/feed/${feed.id}/edit`, { state: { referrer: location.pathname } })} size="small">Bewerken</Button>
      {/** TODO: verbergen? */}
    </DialogActions> : <DialogActions>
      <Button onClick={() => handleClose()}>Annuleren</Button>
      <Button color="success" type="submit" disabled={!isValid}><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
    </DialogActions>}
    {saving && <LinearProgress variant="indeterminate" />}
  </CustomDialog>
}

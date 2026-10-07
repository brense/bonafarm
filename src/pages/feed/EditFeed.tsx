import { useCallback, useRef, useEffect, useState, useMemo, useReducer } from 'react'
import { Button, DialogActions, DialogContent, LinearProgress, TextField, Checkbox, FormControlLabel } from '@mui/material'
import { useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import { useSubscribeCollection, useSubscribeDoc } from '../../hooks/firestore'
import DialogAppbar from '../../components/DialogAppbar'
import CustomAutocomplete from '../../components/CustomAutocomplete'
import { useDoc } from 'firestore-react-hooks'

const initialState = {
  id: '',
  name: '',
  linkedStorageId: undefined as string | undefined,
  hidden: false
}

function reducerFunc(prev: typeof initialState, next: Partial<typeof initialState>) {
  return { ...prev, ...next }
}

export default function EditFeed() {
  const [saving, setSaving] = useState(false)
  const match = useMatch('/feed/:feedId/*')
  const feed = useSubscribeDoc<typeof initialState>(`feeds/${match?.params.feedId}`)
  const storages = useSubscribeCollection<{ id: string, name: string }>('storages')
  const navigate = useNavigate()
  const { onClose } = useOutletContext<{ onClose?: (e: {}, reason?: 'backdropClick' | 'escapeKeyDown') => void }>()
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])
  const inputRef = useRef<HTMLInputElement>()
  const [changes, setChanges] = useReducer(reducerFunc, initialState)
  const isValid = useMemo(() => changes.name !== '' && changes.id !== '', [changes])
  const { setDoc } = useDoc(`feeds/${changes.id || 'add'}`)

  useEffect(() => {
    setChanges(initialState)
  }, [])

  useEffect(() => {
    feed && match?.pathname !== '/feed/add' && setChanges(feed)
  }, [feed, match])

  const handleSave = useCallback(async (e: {}) => {
    setSaving(true)
    const { id, linkedStorageId, ...data } = changes
    await setDoc({ ...data, ...linkedStorageId && { linkedStorageId } })
    onClose && onClose(e)
  }, [onClose, changes, setDoc])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return <>
    <DialogAppbar onClose={onClose}>{isEditing ? `${feed?.name} Bewerken` : 'Voertype toevoegen'}</DialogAppbar>
    <DialogContent>
      <TextField value={changes.name} onChange={e => setChanges({ name: e.target.value })} label="Naam" margin="normal" variant="filled" fullWidth inputRef={inputRef} required />
      {!isEditing && <TextField value={changes.id} helperText="Let op, dit kan later niet meer worden aangepast!" onChange={e => /^$|^[a-z]+$/.test(e.target.value) && setChanges({ id: e.target.value })} required label="Pad" margin="normal" variant="filled" fullWidth inputProps={{ pattern: '^[a-z]+$' }} />}
      <CustomAutocomplete
        label="Koppelen aan opslag (optioneel)"
        value={changes.linkedStorageId ? ({ id: changes.linkedStorageId, name: 'test' } as any) : null}
        onChange={s => setChanges({ linkedStorageId: s?.id })}
        options={storages}
        idKey="id"
        labelKey="name"
        noOptionsText="Niets gevonden..."
        helperText="Koppel dit voertype aan een opslag"
      />
      <FormControlLabel
        control={<Checkbox checked={changes.hidden} onChange={e => setChanges({ hidden: e.target.checked })} />}
        label="Verbergen"
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={() => navigate(isEditing ? `/feed/${feed?.id}` : '/stock')}>Annuleren</Button>
      <Button onClick={handleSave} disabled={!isValid} color="success">Opslaan</Button>
    </DialogActions>
    {saving && <LinearProgress variant="indeterminate" />}
  </>
}

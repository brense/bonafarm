import { TextField } from '@mui/material'
import { useRef } from 'react'
import { Feed, useStorages } from '../../hooks/firebase'
import CustomAutocomplete from '../CustomAutocomplete'

export default function FeedForm({ feed: changes, onChange: setChanges, isEditing = false }: { isEditing?: boolean, feed: Feed, onChange: (changes: Feed | ((current: Feed) => Feed)) => void }) {
  const inputRef = useRef<HTMLInputElement>()
  const { data: storages, loading } = useStorages()

  return <>
    <TextField value={changes.name} onChange={e => setChanges(c => ({ ...c, name: e.target.value }))} label="Naam" margin="normal" variant="filled" fullWidth inputRef={inputRef} required />
    {!isEditing && <TextField value={changes.id} helperText="Let op, dit kan later niet meer worden aangepast!" onChange={e => /^$|^[a-z]+$/.test(e.target.value) && setChanges(c => ({ ...c, id: e.target.value }))} required label="Pad" margin="normal" variant="filled" fullWidth inputProps={{ pattern: '^[a-z]+$' }} />}
    <CustomAutocomplete
      label="Koppelen aan opslag (optioneel)"
      value={changes.linkedStorageId ? ({ id: changes.linkedStorageId, name: 'test' } as any) : null}
      onChange={s => setChanges(c => ({ ...c, linkedStorageId: s?.id }))}
      options={storages}
      idKey="id"
      labelKey="name"
      noOptionsText="Niets gevonden..."
      helperText="Koppel dit voertype aan een opslag"
    />
  </>
}

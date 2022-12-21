import { Avatar, FormControl, FormControlLabel, FormLabel, InputAdornment, Popover, Radio, RadioGroup, TextField } from '@mui/material'
import { useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Storage } from '../../hooks/firebase'

export default function StorageForm({ storage: changes, onChange: setChanges, isEditing = false }: { isEditing?: boolean, storage: Storage, onChange: (changes: Storage | ((current: Storage) => Storage)) => void }) {
  const inputRef = useRef<HTMLInputElement>()
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)

  return <>
    <TextField value={changes.name} onChange={e => setChanges(c => ({ ...c, name: e.target.value }))} label="Naam" margin="normal" variant="filled" fullWidth inputRef={inputRef} required />
    {!isEditing && <TextField value={changes.id} helperText="Let op, dit kan later niet meer worden aangepast!" onChange={e => /^$|^[a-z]+$/.test(e.target.value) && setChanges(c => ({ ...c, id: e.target.value }))} required label="Pad" margin="normal" variant="filled" fullWidth inputProps={{ pattern: '^[a-z]+$' }} />}
    <FormControl margin="normal">
      <FormLabel>Type opslag</FormLabel>
      <RadioGroup row value={changes.canEmpty ? 'koker' : 'ton'} onChange={(e, v) => setChanges(c => ({ ...c, canEmpty: v === 'koker' }))}>
        <FormControlLabel value="ton" control={<Radio />} label="Ton" />
        <FormControlLabel value="koker" control={<Radio />} label="Koker" />
      </RadioGroup>
    </FormControl>
    {!changes.canEmpty && <TextField inputRef={inputRef} onClick={e => setAnchorEl(e.currentTarget)} label="Kleur" required margin="normal" value={changes.color} variant="filled" fullWidth InputLabelProps={{ shrink: true }} InputProps={{
      startAdornment: <InputAdornment position="start">
        <Avatar sx={{ bgcolor: changes.color, height: 24, width: 24 }}>{''}</Avatar>
      </InputAdornment>
    }} />}
    <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} sx={{ '& .MuiPopover-paper': { overflow: 'hidden', backgroundColor: 'none' } }}><HexColorPicker color={changes.color} onChange={color => setChanges(c => ({ ...c, color }))} /></Popover>
    {changes.canEmpty && <TextField label="Icoontje" margin="normal" variant="filled" fullWidth />}{/** TODO make image upload that only accepts svg */}
  </>
}

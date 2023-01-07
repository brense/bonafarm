import { Avatar, Box, CircularProgress, FormControl, FormControlLabel, FormLabel, InputAdornment, Popover, Radio, RadioGroup, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState, useCallback } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Storage } from '../../hooks/firebase'
import { useDropzone } from 'react-dropzone'
import { CropperRef, Cropper, CircleStencil } from 'react-advanced-cropper'
import 'react-advanced-cropper/dist/style.css'

let timeout: NodeJS.Timeout

export default function StorageForm({ storage: changes, onChange: setChanges, isEditing = false }: { isEditing?: boolean, storage: Storage, onChange: (changes: Storage | ((current: Storage) => Storage)) => void }) {
  const inputRef = useRef<HTMLInputElement>()
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setLoadingPreview(true)
    const fileReader = new FileReader()
    fileReader.onload = () => {
      setPreviewImg(fileReader.result as string | null)
      setLoadingPreview(false)
    }
    fileReader.readAsDataURL(acceptedFiles[0])
  }, [])
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1, multiple: false })

  useEffect(() => {
    setPreviewImg(null)
    setLoadingPreview(false)
  }, [])

  const onChange = useCallback((cropper: CropperRef) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      const image = cropper.getCanvas({ height: 192, width: 192 })?.toDataURL()
      setChanges(c => ({ ...c, image }))
    }, 300)
  }, [setChanges])

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
    {changes.canEmpty && <FormControl margin="normal" fullWidth>
      <FormLabel>Icoontje</FormLabel>
      {/**TODO: handle already existing image when editting */}
      {!previewImg ? <Box sx={{ height: 200, width: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }} {...getRootProps()}>
        <input {...getInputProps()} />
        {!previewImg && !loadingPreview && <Typography align="center">Sleep een afbeelding naar dit kader,<br />of klik hier</Typography>}
        {loadingPreview && <CircularProgress />}
      </Box> : <Cropper
        src={previewImg}
        onChange={onChange}
        className={'cropper'}
        stencilComponent={CircleStencil}
      />}
    </FormControl>}
  </>
}

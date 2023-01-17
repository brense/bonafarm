import { useCallback, useMemo, useRef, useState, useEffect, useReducer } from 'react'
import { Avatar, Box, Button, CircularProgress, DialogActions, DialogContent, Divider, FormControl, FormControlLabel, FormLabel, InputAdornment, LinearProgress, Popover, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material'
import { useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import DialogAppbar from '../../components/DialogAppbar'
import { useDoc, useSubscribeDoc } from '../../hooks/firestore'
import { CircleStencil, Cropper, CropperRef } from 'react-advanced-cropper'
import { useDropzone } from 'react-dropzone'
import { HexColorPicker } from 'react-colorful'
import { getDownloadURL, getStorage, ref as storageRef, uploadString } from 'firebase/storage'
import 'react-advanced-cropper/dist/style.css'

const firebaseStorage = getStorage()

const initialState = {
  id: '',
  name: '',
  type: 'storage' as 'storage' | 'shute' | 'stable',
  color: undefined as undefined | string,
  image: undefined as undefined | string,
  newImage: undefined as undefined | string,
  order: 999
}

function reducerFunc(prev: typeof initialState, next: Partial<typeof initialState>) {
  return { ...prev, ...next }
}

let timeout: NodeJS.Timeout

export default function EditStorage() {
  const [saving, setSaving] = useState(false)
  const match = useMatch('/stock/:storageId/*')
  const storage = useSubscribeDoc<typeof initialState>(`storages/${match?.params.storageId}`)
  const navigate = useNavigate()
  const { onClose } = useOutletContext<{ onClose?: (e: {}, reason?: 'backdropClick' | 'escapeKeyDown') => void }>()
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])
  const inputRef = useRef<HTMLInputElement>()
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const [previewImg, setPreviewImg] = useState<{ name: string, image: string | null } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setLoadingPreview(true)
    const fileReader = new FileReader()
    fileReader.onload = () => {
      setPreviewImg({ name: acceptedFiles[0].name, image: fileReader.result as string | null })
      setLoadingPreview(false)
    }
    fileReader.readAsDataURL(acceptedFiles[0])
  }, [])
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1, multiple: false })
  const [changes, setChanges] = useReducer(reducerFunc, initialState)
  const isValid = useMemo(() => changes.name !== '' && changes.id !== '', [changes])
  const { set: setStorage } = useDoc(`storages/${changes.id || 'add'}`)
  const { set: setDoc } = useDoc()

  useEffect(() => {
    setChanges(initialState)
    setPreviewImg(null)
    setLoadingPreview(false)
  }, [])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  useEffect(() => {
    storage && match?.pathname !== '/stock/add' && setChanges(storage)
  }, [storage, match])

  const defaultSize = useCallback(({ imageSize, visibleArea }: { visibleArea?: { width: number, height: number } | null, imageSize: { width: number, height: number } }) => {
    return {
      width: (visibleArea || imageSize).width,
      height: (visibleArea || imageSize).height,
    }
  }, [])

  const onChange = useCallback((cropper: CropperRef) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      const newImage = cropper.getCanvas({ height: 192, width: 192 })?.toDataURL()
      setChanges({ newImage })
    }, 300)
  }, [setChanges])

  const handleSave = useCallback(async (e: {}) => {
    setSaving(true)
    const { id, color, newImage, image: currentImg, ...data } = changes
    let image = currentImg
    if (newImage) {
      const newImageRef = storageRef(firebaseStorage, id)
      const result = await uploadString(newImageRef, newImage, 'data_url')
      image = await getDownloadURL(result.ref)
    }
    await setStorage({ ...data, ...image && { image }, ...color && { color } })
    if (!isEditing && data.type === 'stable') {
      setDoc(`storages/${changes.id}/items/hooi`, { amount: 0 })
      setDoc(`storages/${changes.id}/items/stro`, { amount: 0 })
    }
    // TODO: if new storage is of type stable, add items collection with "hooi" and "stro"
    onClose && onClose(e)
  }, [onClose, changes, setStorage, setDoc, isEditing])

  return <>
    <DialogAppbar onClose={onClose}>{isEditing ? `${storage?.name} Bewerken` : 'Opslag toevoegen'}</DialogAppbar>
    <DialogContent>
      <TextField value={changes.name} onChange={e => setChanges({ name: e.target.value })} label="Naam" margin="normal" variant="filled" fullWidth inputRef={inputRef} required />
      <TextField value={changes.id} helperText={!isEditing && 'Let op, dit kan later niet meer worden aangepast!'} disabled={isEditing} onChange={e => /^$|^[a-z]+$/.test(e.target.value) && setChanges({ id: e.target.value })} required label="Pad" margin="normal" variant="filled" fullWidth inputProps={{ pattern: '^[a-z]+$' }} />
      <FormControl margin="normal">
        <FormLabel>Type opslag</FormLabel>
        <RadioGroup row value={changes.type} onChange={(e, v) => setChanges({ type: v as 'storage' })}>
          <FormControlLabel value="storage" control={<Radio />} label="Ton" />
          <FormControlLabel value="shute" control={<Radio />} label="Koker" />
          <FormControlLabel value="stable" control={<Radio />} label="Stal" />
        </RadioGroup>
      </FormControl>
      <FormControl margin="normal" fullWidth>
        <FormLabel>Kies een icoontje of kleur voor de opslag</FormLabel>
        <Stack direction="row" gap={1} sx={{ my: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Box sx={{ height: 192, width: 192, p: !previewImg ? 1 : 0, borderRadius: 3, cursor: 'pointer', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} {...getRootProps()}>
              {!previewImg && <input {...getInputProps()} />}
              {!previewImg && changes.image && <Avatar><img src={changes.image} alt="" width={40} height={40} style={{ borderRadius: 96 }} /></Avatar>}
              {!previewImg && !changes.image && <Typography align="center" variant="body2">Klik om een afbeelding te kiezen, of sleep de afbeelding naar dit kader.</Typography>}
              {previewImg && !loadingPreview && <Cropper
                src={previewImg?.image}
                onChange={onChange}
                className={'cropper'}
                stencilComponent={CircleStencil}
                defaultSize={defaultSize}
              />}
              {loadingPreview && <CircularProgress />}
            </Box>
          </Box>
          <Divider orientation="vertical" flexItem><Typography variant="button" color="textSecondary">Of</Typography></Divider>
          <TextField inputRef={inputRef} onClick={e => setAnchorEl(e.currentTarget)} label="Kleur" required value={changes.color || ''} onChange={e => setChanges({ color: e.target.value })} variant="filled" fullWidth InputLabelProps={{ shrink: true }} InputProps={{
            startAdornment: <InputAdornment position="start">
              <Avatar sx={{ bgcolor: changes.color, height: 24, width: 24 }}>{''}</Avatar>
            </InputAdornment>
          }} />
          <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} sx={{ '& .MuiPopover-paper': { overflow: 'hidden', backgroundColor: 'none' } }}><HexColorPicker color={changes.color} onChange={color => setChanges({ color })} /></Popover>
        </Stack>
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => navigate(isEditing ? `/stock/${storage?.id}` : '/stock')}>Annuleren</Button>
      <Button onClick={handleSave} disabled={!isValid} color="success">Opslaan</Button>
    </DialogActions>
    {saving && <LinearProgress variant="indeterminate" />}
  </>
}

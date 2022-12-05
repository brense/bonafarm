import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Autocomplete, Box, Button, createFilterOptions, DialogActions, DialogContent, Icon, Slide, TextField } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate, useLocation } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import { useAddLogMutation, useStoragesQuery } from '../graphql'

const itemFilter = createFilterOptions<{ title: string, slug: string, inputValue?: string }>()
const storageFilter = createFilterOptions<{ title: string, id: string, inputValue?: string }>()

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddItem() {
  const match = useMatch('/stock/:storageId/add')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()
  const { state } = useLocation()
  const { data } = useStoragesQuery({ fetchPolicy: 'no-cache' })
  const [addLog] = useAddLogMutation()
  const itemOptions = useMemo(() => data?.storages.reduce((arr, storage) => {
    storage.logs.filter(l => l.slug && l.title).forEach(({ slug, title }) => {
      if (arr.find(a => a.slug === slug)) return
      arr.push({ slug, title } as any)
    })
    return arr
  }, [] as Array<{ slug: string, title: string, inputValue?: string }>) || [], [data?.storages])
  const storageOptions = useMemo<Array<{ id: string, title: string, inputValue?: string }>>(() => data?.storages.map(({ title, id, canEmpty }) => ({ title: canEmpty ? `${title} koker` : title, id })) || [], [data])
  const [item, setItem] = useState<{ title: string, slug: string, inputValue?: string } | null>()
  const [storage, setStorage] = useState<{ title: string, id: string, inputValue?: string } | null>()

  const handleClose = useCallback((goBack = true) => {
    setItem(null)
    setStorage(null)
    goBack && navigate(-1)
  }, [navigate])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const title = item?.inputValue || item?.title
    const slug = item?.slug !== '' ? item?.slug : title?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
    const amount = Math.abs(state?.item?.amount) || 1
    storage?.id && await addLog({ variables: { item: { storageId: storage?.id, slug, title, amount } }, refetchQueries: ['Storages'] })
    handleClose(false)
    navigate(`/stock/${storage?.id}`, { state: { goBack: '/stock' } })
  }, [handleClose, item, storage, state?.item, addLog, navigate])

  useEffect(() => {
    if (state?.item) {
      setItem(state.item)
      setStorage(storageOptions.find(s => s.id === state.item.slug))
    } else {
      setStorage(storageOptions.find(s => s.id === match?.params.storageId))
    }
  }, [state, match, storageOptions])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return <CustomDialog title="Zak toevoegen" open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={() => handleClose()}>
    <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }} onSubmit={handleSubmit}>
      <DialogContent sx={{ flex: 1 }}>
        <Autocomplete
          value={item || { title: '', slug: '' }}
          onChange={(event, newValue) => {
            setItem(newValue)
          }}
          isOptionEqualToValue={(opt, val) => opt.slug === val.slug}
          filterOptions={(options, params) => {
            const filtered = itemFilter(options, params)
            if (params.inputValue.length >= 3) {
              filtered.push({
                inputValue: params.inputValue,
                title: `"${params.inputValue}" toevoegen`,
                slug: ''
              })
            }
            return filtered
          }}
          options={itemOptions}
          getOptionLabel={(option) => {
            if (typeof option === 'string') {
              return option;
            }
            if (option.inputValue) {
              return option.inputValue
            }
            return option.title
          }}
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          renderOption={(props, option) => <li {...props}>{option.title}</li>}
          renderInput={(params) => <TextField {...params} variant="filled" margin="normal" label="Naam" inputRef={inputRef} />}
          fullWidth
        />
        <Autocomplete
          value={storage || { title: '', id: '' }}
          onChange={(event, newValue) => {
            setStorage(newValue)
          }}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          filterOptions={(options, params) => {
            const filtered = storageFilter(options, params)
            if (params.inputValue.length >= 3) {
              filtered.push({
                inputValue: params.inputValue,
                title: `"${params.inputValue}" toevoegen`,
                id: ''
              })
            }
            return filtered
          }}
          options={storageOptions}
          getOptionLabel={(option) => {
            if (typeof option === 'string') {
              return option;
            }
            if (option.inputValue) {
              return option.inputValue
            }
            return option.title
          }}
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          renderOption={(props, option) => <li {...props}>{option.title}</li>}
          renderInput={(params) => <TextField {...params} variant="filled" margin="normal" label="Opslag" />}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose()}>Annuleren</Button>
        <Button color="success" type="submit" disabled={!item || !storage}><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
    </Box>
  </CustomDialog>
}

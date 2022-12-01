import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Autocomplete, Box, Button, createFilterOptions, DialogActions, DialogContent, Icon, Slide, TextField } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate, useLocation } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import { useStoragesQuery } from '../graphql'

const filter = createFilterOptions<{ title: string, slug: string, inputValue?: string }>()

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddItem() {
  const match = useMatch('/stock/:storageId/add')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()
  const { state } = useLocation()
  const { data, loading } = useStoragesQuery()
  const itemOptions = useMemo(() => data?.storages.reduce((arr, storage) => {
    if (storage.items.length > 0) {
      storage.items.forEach(({ amount, ...item }) => {
        if (arr.find(a => a.slug === item.slug)) return
        arr.push(item)
      })
    }
    return arr
  }, [] as Array<{ slug: string, title: string, inputValue?: string }>) || [], [data?.storages])
  const [name, setName] = useState<{ title: string, slug: string, inputValue?: string } | null>()

  const handleClose = useCallback(() => {
    setName(null)
    navigate(-1)
  }, [navigate])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    console.log(e)
    handleClose()
  }, [handleClose])

  useEffect(() => {
    if (state?.item) {
      console.log(state.item)
      setName(state.item)
    }
  }, [state])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return <CustomDialog title="Item toevoegen" open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={() => handleClose()}>
    <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} onSubmit={handleSubmit}>
      <DialogContent sx={{ flex: 1 }}>
        <Autocomplete
          value={name || { title: '', slug: '' }}
          onChange={(event, newValue) => {
            console.log('on change', newValue)
          }}
          isOptionEqualToValue={(opt, val) => opt.slug === val.slug}
          filterOptions={(options, params) => {
            const filtered = filter(options, params)

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
            // e.g value selected with enter, right from the input
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
        <TextField label="Locatie" variant="filled" margin="normal" fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button color="success" type="submit"><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
    </Box>
  </CustomDialog>
}

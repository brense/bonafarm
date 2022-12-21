import { useMemo } from 'react'
import { Autocomplete, AutocompleteProps, createFilterOptions, TextField, TextFieldProps } from '@mui/material'

export default function CustomAutocomplete<T extends { [key: string]: any, inputValue?: string }>({ label, margin, inputRef, helperText, newOption, ...autocompleteProps }: Omit<AutocompleteProps<T, false, false, false>, 'onChange' | 'options' | 'renderInput'> & Pick<TextFieldProps, 'margin' | 'inputRef' | 'label' | 'helperText'> & { newOption?: (params: { inputValue: string }) => Omit<T, 'inputValue'>, options: T[], idKey: keyof T, labelKey: keyof T, onChange?: (value: T | null) => void }) {
  const { onChange, labelKey, idKey, ...rest } = autocompleteProps
  const filter = useMemo(() => createFilterOptions<T>(), [])

  return <Autocomplete
    onChange={(event, newValue) => onChange && onChange(newValue)}
    isOptionEqualToValue={(opt, val) => opt[idKey] === val[idKey]}
    filterOptions={(options, params) => {
      const filtered = filter(options, params)
      if (newOption && params.inputValue.length >= 3) {
        filtered.push({
          inputValue: params.inputValue,
          ...newOption(params)
        } as T)
      }
      return filtered
    }}
    getOptionLabel={(option) => {
      if (typeof option === 'string') {
        return option;
      }
      if (option.inputValue) {
        return option.inputValue
      }
      return (rest.options.find(o => o[idKey] === option[idKey]) as any)[labelKey] as string
    }}
    selectOnFocus
    clearOnBlur
    handleHomeEndKeys
    renderOption={(props, option) => <li {...props}>{option[labelKey] as string}</li>}
    renderInput={(params) => <TextField {...params} variant="filled" margin={margin} label={label} inputRef={inputRef} helperText={helperText} />}
    fullWidth
    {...rest}
  />
}

import { Box, ButtonBase, ButtonBaseProps, Card, CardHeader, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import { useCallback, useState } from 'react'

type Item = { amount: number, slug: string, title: string }

function BigButton({ children, color, size = 'large', ...rest }: ButtonBaseProps & { size?: 'large' | 'small' }) {
  return <ButtonBase {...rest} sx={{ flex: 1, py: size === 'large' ? 2 : 2.6, px: size === 'large' ? 1 : 0 }}>
    <Typography variant={size === 'large' ? 'h6' : 'subtitle2'} color={color}>{children}</Typography>
  </ButtonBase>
}

export default function StorageItem({ onMutateItem, item }: { item: Item, onMutateItem: (item: Item) => Promise<void> }) {
  const [mutating, setMutating] = useState(false)

  const handleMutation = useCallback(async (item: Item) => {
    setMutating(true)
    await onMutateItem(item)
    setMutating(false)
  }, [onMutateItem])

  return <Card>
    <CardHeader title={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="h5" noWrap>{item.title}</Typography><Typography variant="subtitle2" noWrap>{item.amount.toLocaleString()} stuks</Typography></Box>} disableTypography />
    <Divider />
    <Stack direction="row" justifyContent="space-evenly" alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
      <BigButton color="error" disabled={mutating} onClick={() => handleMutation({ ...item, amount: -1 })}>-1</BigButton>
      <BigButton size="small" disabled={mutating} color="error" onClick={() => handleMutation({ ...item, amount: -0.5 })}>-0,5</BigButton>
      <BigButton size="small" disabled={mutating} color="primary" onClick={() => handleMutation({ ...item, amount: +0.5 })}>+0,5</BigButton>
      <BigButton color="primary" disabled={mutating} onClick={() => handleMutation({ ...item, amount: +1 })}>+1</BigButton>
    </Stack>
    {mutating && <LinearProgress variant="indeterminate" sx={{ mt: -0.5 }} />}
  </Card>
}

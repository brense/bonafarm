import { Box, ButtonBase, ButtonBaseProps, Card, CardHeader, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import { Feed } from '../hooks/firebase'

function BigButton({ children, color, size = 'large', ...rest }: ButtonBaseProps & { size?: 'large' | 'small' }) {
  return <ButtonBase {...rest} sx={{ flex: 1, py: size === 'large' ? 2 : 2.6, px: size === 'large' ? 1 : 0 }}>
    <Typography variant={size === 'large' ? 'h6' : 'subtitle2'} color={color}>{children}</Typography>
  </ButtonBase>
}

export default function StorageItem({ onMutate, item }: { item: { feed?: Feed, amount: number }, onMutate: (amount: number, movedAmount: number) => Promise<void> }) {
  const [mutating, setMutating] = useState(false)

  const handleMutation = useCallback(async (movedAmount: number) => {
    setMutating(true)
    await onMutate(item.amount += movedAmount, movedAmount)
    setMutating(false)
  }, [onMutate, item])

  return <Card>
    <CardHeader title={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="h5" noWrap>{item.feed?.name}</Typography><Typography variant="subtitle2" noWrap>{item.amount.toLocaleString()} stuks</Typography></Box>} disableTypography />
    <Divider />
    <Stack direction="row" justifyContent="space-evenly" alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
      <BigButton color="error" disabled={mutating} onClick={() => handleMutation(-1)}>-1</BigButton>
      <BigButton size="small" disabled={mutating} color="error" onClick={() => handleMutation(-0.5)}>-0,5</BigButton>
      <BigButton size="small" disabled={mutating} color="primary" onClick={() => handleMutation(+0.5)}>+0,5</BigButton>
      <BigButton color="primary" disabled={mutating} onClick={() => handleMutation(+1)}>+1</BigButton>
    </Stack>
    {mutating && <LinearProgress variant="indeterminate" sx={{ mt: -0.5 }} />}
  </Card>
}

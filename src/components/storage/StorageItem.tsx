import { Box, Card, CardHeader, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import BigButton from '../BigButton'

export default function StorageItem({ onMutate, item }: { item: { feed?: { name: string }, amount: number }, onMutate: (amount: number, movedAmount: number) => Promise<void> }) {
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

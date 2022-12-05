import { Box, ButtonBase, ButtonBaseProps, Card, CardHeader, Divider, Stack, Typography } from '@mui/material'
import { useCallback } from 'react'
import { useAddLogMutation } from '../graphql'

type Item = { amount: number, slug: string, title: string }

function BigButton({ children, color, size = 'large', ...rest }: ButtonBaseProps & { size?: 'large' | 'small' }) {
  return <ButtonBase {...rest} sx={{ flex: 1, py: size === 'large' ? 2 : 2.6, px: size === 'large' ? 1 : 0 }}>
    <Typography variant={size === 'large' ? 'h6' : 'subtitle2'} color={color}>{children}</Typography>
  </ButtonBase>
}

export default function StorageItem({ onMoveItem, item, storageId }: { storageId?: string, item: Item, onMoveItem: (item: Item) => void }) {
  const [addLog, { loading: adding }] = useAddLogMutation()

  const handleMutation = useCallback(async (item: { amount: number, title: string, slug: string }) => {
    storageId && await addLog({ variables: { item: { storageId, ...item } }, refetchQueries: ['Storages'] })
    if (item.amount < 0) {
      onMoveItem(item)
    }
  }, [addLog, storageId, onMoveItem])

  return <Card>
    <CardHeader title={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="h5" noWrap>{item.title}</Typography><Typography variant="subtitle2" noWrap>{item.amount} stuks</Typography></Box>} disableTypography />
    <Divider />
    <Stack direction="row" justifyContent="space-evenly" alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
      <BigButton color="error" disabled={adding} onClick={() => handleMutation({ ...item, amount: -1 })}>-1</BigButton>
      <BigButton size="small" color="error" disabled={adding} onClick={() => handleMutation({ ...item, amount: -0.5 })}>-0,5</BigButton>
      <BigButton size="small" color="secondary" disabled={adding} onClick={() => handleMutation({ ...item, amount: +0.5 })}>+0,5</BigButton>
      <BigButton color="secondary" disabled={adding} onClick={() => handleMutation({ ...item, amount: +1 })}>+1</BigButton>
    </Stack>
  </Card>
}

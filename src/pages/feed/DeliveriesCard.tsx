import { Box, Divider, Stack, Typography } from '@mui/material'
import type { Unit } from '../../model/types.ts'
import type { DeliverySchedule } from '../../stock/advice.ts'
import { DELIVERY_CYCLE_DAYS } from '../../stock/advice.ts'
import type { Delivery } from '../../stock/consumption.ts'
import { CardSurface } from '../../stock/SearchList.tsx'
import { formatAmount, unitLabel } from '../../stock/stock.ts'
import { dateShort, dateShortYear } from './format.ts'

interface Props {
  deliveries: Delivery[]
  median: number | null
  unit: Unit
  schedule: DeliverySchedule
  nowMs: number
  storageName: (id: string) => string
}

export default function DeliveriesCard({ deliveries, median, unit, schedule, nowMs, storageName }: Props) {
  const thisYear = new Date(nowMs).getFullYear()
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" component="h2">
          Leveringen
        </Typography>
        {deliveries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Nog geen leveringen geregistreerd.
          </Typography>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
              Laatste {deliveries.length} leveringen
            </Typography>
            <Stack divider={<Divider />} spacing={1}>
              {deliveries.map((d) => (
                <Stack key={d.dayMs} direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, width: 84, flexShrink: 0 }}>
                    {(new Date(d.dayMs).getFullYear() === thisYear ? dateShort : dateShortYear).format(d.dayMs)}
                  </Typography>
                  <Typography variant="body2" sx={{ flexShrink: 0 }}>
                    <b>{formatAmount(d.amount)}</b> {unitLabel(unit, d.amount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.perStorage.length === 1
                      ? storageName(d.perStorage[0].storageId)
                      : d.perStorage.map((s) => `${formatAmount(s.amount)} ${storageName(s.storageId)}`).join(' · ')}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
              Levering elke {DELIVERY_CYCLE_DAYS} dagen
              {median !== null ? `, meestal ±${formatAmount(median)} ${unitLabel(unit, median)}` : ''}. Volgende: {dateShort.format(schedule.next)}, daarna{' '}
              {dateShort.format(schedule.after)}.
            </Typography>
          </>
        )}
      </Box>
    </CardSurface>
  )
}

import { useCallback } from 'react'
import { Button, DialogActions, DialogContent, Divider, Icon } from '@mui/material'
import { useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import { useSubscribeDoc } from '../../hooks/firestore'
import { useConfirmDialog } from '../../components/ConfirmDialog'
import DialogAppbar from '../../components/DialogAppbar'

type Storage = {
  name: string
  type: 'storage' | 'shute' | 'stable'
}

export default function StorageDetails() {
  const match = useMatch('/stock/:storageId/*')
  const storage = useSubscribeDoc<Storage>(`storages/${match?.params.storageId}`)
  const navigate = useNavigate()
  const confirmDeleteDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Verwijderen' })
  const confirmEmptyDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Leegmaken' })
  const { onClose } = useOutletContext<{ onClose?: (e: {}, reason?: 'backdropClick' | 'escapeKeyDown') => void }>()

  const handleDelete = useCallback(() => {
    confirmDeleteDialog.open({
      confirmMessage: 'Weet je zeker dat je deze opslag wilt verwijderen?',
      onConfirm: async () => {
        // TODO: remove storage
        navigate('/stock')
      }
    })
  }, [confirmDeleteDialog, navigate])

  const handleEmpty = useCallback(() => {
    confirmEmptyDialog.open({
      confirmMessage: 'Weet je zeker dat je deze opslag wilt leegmaken?',
      onConfirm: async () => {
        // TODO: empty storage.items
      }
    })
  }, [confirmEmptyDialog])

  return <>
    <DialogAppbar onClose={onClose}>{storage?.name}</DialogAppbar>
    <DialogContent sx={{ p: 0 }}>
      <Divider>Laatste wijzigingen</Divider>
    </DialogContent>
    <DialogActions>
      {storage?.type === 'shute' && <Button onClick={handleEmpty} color="inherit"><Icon>cancel</Icon>&nbsp;&nbsp;Leegmaken</Button>}
      <Button onClick={() => navigate(`/stock/${storage?.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Bewerken</Button>
      <Button onClick={handleDelete} color="error"><Icon>delete</Icon>&nbsp;&nbsp;Verwijderen</Button>
    </DialogActions>
  </>
}

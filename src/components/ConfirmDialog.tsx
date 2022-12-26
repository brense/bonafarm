import React, { useState, useCallback, useContext } from 'react'
import { Dialog, DialogActions, DialogContent } from '@mui/material'

const ConfirmDialogContext = React.createContext<{ setOpen: React.Dispatch<React.SetStateAction<boolean>>, setMessage: React.Dispatch<React.SetStateAction<string>> }>({} as any)

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext)
  const open = useCallback(({ confirmMessage, onCancel, onConfirm }: { confirmMessage: string, onCancel: () => void, onConfirm: () => void }) => {

  }, [])
  return { open }
}

export default function ConfirmDialogProvider({ children }: React.PropsWithChildren<unknown>) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  return <ConfirmDialogContext.Provider value={{ setOpen, setMessage }}>
    {children}
    <Dialog open={open}>
      <DialogContent>{message}</DialogContent>
      <DialogActions></DialogActions>
    </Dialog>
  </ConfirmDialogContext.Provider>
}

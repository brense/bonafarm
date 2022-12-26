import React, { useState, useCallback, useContext } from 'react'
import { Button, Dialog, DialogActions, DialogContent, useMediaQuery, useTheme } from '@mui/material'

type ContextState = {
  open: boolean
  confirmMessage: string
  cancelText?: string
  confirmText?: string
  onCancel?: () => (void | Promise<void>)
  onConfirm?: () => (void | Promise<void>)
}

const ConfirmDialogContext = React.createContext<{ setContext: React.Dispatch<React.SetStateAction<ContextState>> }>({} as any)

export function useConfirmDialog(state: Omit<ContextState, 'open' | 'onCancel' | 'onConfirm' | 'confirmMessage'>) {
  const { setContext } = useContext(ConfirmDialogContext)
  const open = useCallback((callbacks: Pick<ContextState, 'onCancel' | 'onConfirm' | 'confirmMessage'>) => {
    setContext({
      open: true,
      ...state,
      ...callbacks
    })
  }, [setContext, state])
  return { open }
}

export default function ConfirmDialogProvider({ children }: React.PropsWithChildren<unknown>) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [context, setContext] = useState<ContextState>({ open: false, confirmMessage: '' })
  const handleCancel = useCallback(async () => {
    await (context.onCancel && context.onCancel())
    setContext({ open: false, confirmMessage: '' })
  }, [context, setContext])
  const handleConfirm = useCallback(async () => {
    await (context.onConfirm && context.onConfirm())
    setContext({ open: false, confirmMessage: '' })
  }, [context, setContext])
  return <ConfirmDialogContext.Provider value={{ setContext }}>
    {children}
    <Dialog open={context.open} fullScreen={isMobile}>
      <DialogContent>{context.confirmMessage}</DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="error">{context.cancelText || 'Annuleren'}</Button>
        <Button onClick={handleConfirm} color="primary">{context.confirmText || 'Toestaan'}</Button>
      </DialogActions>
    </Dialog>
  </ConfirmDialogContext.Provider>
}

import { Dialog, DialogProps, Slide, useMediaQuery, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import React, { useMemo, useCallback } from 'react'
import { Outlet, Route, Routes, useMatch, useNavigate } from 'react-router-dom'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function DetailDialog({ children, ...dialogProps }: React.PropsWithChildren<DialogProps>) {
  const match = useMatch('/stock/:storageId/*')
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])

  const handleClose = useCallback((event: {}, reason?: 'backdropClick' | 'escapeKeyDown') => {
    navigate(isEditing && !reason ? `/stock/${match?.params.storageId}` : '/stock')
  }, [navigate, isEditing, match])

  return <Dialog fullScreen={isMobile} TransitionComponent={Transition} keepMounted onClose={handleClose} {...dialogProps}>
    <Routes>
      <Route element={<Outlet context={{ onClose: handleClose }} />}>
        {children}
      </Route>
    </Routes>
  </Dialog>
}

import { ButtonBase, ButtonBaseProps, Typography } from '@mui/material'

export default function BigButton({ children, color, size = 'large', ...rest }: ButtonBaseProps & { size?: 'large' | 'small' }) {
  return <ButtonBase {...rest} sx={{ flex: 1, py: size === 'large' ? 2 : 2.6, px: size === 'large' ? 1 : 0 }}>
    <Typography variant={size === 'large' ? 'h6' : 'subtitle2'} color={rest.disabled ? 'textSecondary' :color}>{children}</Typography>
  </ButtonBase>
}

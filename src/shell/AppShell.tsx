import EditIcon from '@mui/icons-material/EditOutlined'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import LogoutIcon from '@mui/icons-material/Logout'
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined'
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useState, type ReactElement } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { useBranding } from '../branding/useBranding.ts'
import { useOrg } from '../org/useOrg.ts'
import { can, visibleTabs, type Tab } from '../org/roles.ts'
import MutationDialog from '../stock/MutationDialog.tsx'

const TAB_META: Record<Tab, { label: string; icon: ReactElement }> = {
  stock: { label: 'Voorraad', icon: <InventoryIcon /> },
  storages: { label: 'Opslagen', icon: <WarehouseIcon /> },
}

const DRAWER_WIDTH = 240
/** BottomNavigation is 56px; a bit more so content never hides under it. */
const BOTTOM_NAV_HEIGHT = 64

function AccountMenu() {
  const { user, signOut } = useAuth()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const name = user?.displayName || user?.email || ''
  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Account"
        aria-haspopup="menu"
        size="small"
        sx={{ ml: 1 }}
      >
        <Avatar src={user?.photoURL ?? undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>
          {name.slice(0, 1).toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={() => setAnchor(null)}>
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {name}
          </Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            void signOut()
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Uitloggen
        </MenuItem>
      </Menu>
    </>
  )
}

/**
 * Frame around the three use-case pages. On phones the navigation sits at the
 * bottom (thumb zone); on desktop it is a permanent drawer.
 */
export default function AppShell() {
  const { branding } = useBranding()
  const { roles } = useOrg()
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true })
  const location = useLocation()
  const navigate = useNavigate()
  const tabs = visibleTabs(roles)
  const current = tabs.find((t) => location.pathname === `/${t}` || location.pathname.startsWith(`/${t}/`))
  const [dialOpen, setDialOpen] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)
  const mayFeed = can(roles, 'feed')

  if (!current) return <Navigate to={`/${tabs[0]}`} replace />

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <AppBar
        position="fixed"
        color="secondary"
        enableColorOnDark
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1 }}>
            {branding.appName}
          </Typography>
          <AccountMenu />
        </Toolbar>
      </AppBar>

      {desktop && (
        <Drawer
          variant="permanent"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          <Toolbar />
          <List component="nav" aria-label="Hoofdmenu">
            {tabs.map((tab) => (
              <ListItemButton key={tab} selected={tab === current} onClick={() => navigate(`/${tab}`)}>
                <ListItemIcon>{TAB_META[tab].icon}</ListItemIcon>
                <ListItemText primary={TAB_META[tab].label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          pb: desktop ? 0 : `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {mayFeed && (
        <SpeedDial
          ariaLabel="Acties"
          icon={<SpeedDialIcon />}
          open={dialOpen}
          onOpen={() => setDialOpen(true)}
          onClose={() => setDialOpen(false)}
          sx={{
            position: 'fixed',
            right: 16,
            bottom: desktop ? 24 : `calc(${BOTTOM_NAV_HEIGHT}px + 12px + env(safe-area-inset-bottom))`,
            zIndex: (t) => t.zIndex.speedDial,
          }}
        >
          <SpeedDialAction
            icon={<EditIcon />}
            slotProps={{ tooltip: { title: 'Wijziging maken', open: true } }}
            onClick={() => {
              setDialOpen(false)
              setMutating(true)
            }}
          />
        </SpeedDial>
      )}
      <MutationDialog open={mutating} onClose={() => setMutating(false)} onDone={setSnack} />
      <Snackbar open={snack !== null} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack} />

      {!desktop && (
        <Paper
          elevation={3}
          square
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, pb: 'env(safe-area-inset-bottom)', zIndex: (t) => t.zIndex.appBar }}
        >
          <BottomNavigation
            showLabels
            value={current}
            onChange={(_e, value: Tab) => navigate(`/${value}`)}
            component="nav"
            aria-label="Hoofdmenu"
          >
            {tabs.map((tab) => (
              <BottomNavigationAction
                key={tab}
                value={tab}
                label={TAB_META[tab].label}
                icon={TAB_META[tab].icon}
                // Tapping the active tab goes back to its root: the tab is the back button.
                onClick={() => navigate(`/${tab}`)}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}

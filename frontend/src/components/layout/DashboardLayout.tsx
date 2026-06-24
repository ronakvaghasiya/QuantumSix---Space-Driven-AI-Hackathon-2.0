'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Stack,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import MenuIcon from '@mui/icons-material/Menu';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LoginIcon from '@mui/icons-material/Login';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ExtensionIcon from '@mui/icons-material/Extension';
import GroupIcon from '@mui/icons-material/Group';
import TuneIcon from '@mui/icons-material/Tune';
import { ReactNode, useMemo, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { UserMenu } from '@/components/auth/UserMenu';

const NAV_WIDTH = 280;
const AUTH_PATHS = ['/login', '/register'];

type NavItem = { label: string; href: string; icon: ReactNode };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: <DashboardIcon fontSize="small" /> },
      { label: 'Projects', href: '/projects', icon: <FolderIcon fontSize="small" /> },
      { label: 'Tasks', href: '/tasks', icon: <AssignmentIcon fontSize="small" /> },
      { label: 'Reports', href: '/reports', icon: <AssessmentIcon fontSize="small" /> },
      { label: 'Analytics', href: '/analytics', icon: <AnalyticsIcon fontSize="small" /> },
    ],
  },
  {
    title: 'Organization',
    items: [
      { label: 'Billing', href: '/billing', icon: <CreditCardIcon fontSize="small" /> },
      { label: 'Members', href: '/org/members', icon: <GroupIcon fontSize="small" /> },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Integrations', href: '/settings', icon: <TuneIcon fontSize="small" /> },
      { label: 'Notifications', href: '/settings/notifications', icon: <NotificationsIcon fontSize="small" /> },
      { label: 'Security', href: '/settings/security', icon: <SecurityIcon fontSize="small" /> },
      { label: 'Vault', href: '/settings/vault', icon: <VpnKeyIcon fontSize="small" /> },
      { label: 'SSO', href: '/settings/sso', icon: <LoginIcon fontSize="small" /> },
      { label: 'Workflow', href: '/settings/workflow', icon: <AccountTreeIcon fontSize="small" /> },
      { label: 'Plugins', href: '/settings/plugins', icon: <ExtensionIcon fontSize="small" /> },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/settings') return pathname === '/settings';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentPageTitle(pathname: string): string {
  const match = ALL_NAV_ITEMS.find((item) => isNavActive(pathname, item.href));
  return match?.label || 'RepoPilot AI';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [open, setOpen] = useState(false);
  const isAuthPage = AUTH_PATHS.includes(pathname);
  const pageTitle = useMemo(() => currentPageTitle(pathname), [pathname]);

  if (isAuthPage) {
    return (
      <AuthGuard>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>{children}</Box>
      </AuthGuard>
    );
  }

  const sidebar = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
            <AutoAwesomeIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
              RepoPilot AI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              QuantumSix · Hackathon 2.0
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 1.5 }}>
        {NAV_SECTIONS.map((section, idx) => (
          <Box key={section.title} sx={{ mb: idx < NAV_SECTIONS.length - 1 ? 1.5 : 0 }}>
            <Typography
              variant="overline"
              sx={{ px: 1.5, py: 0.75, display: 'block' }}
            >
              {section.title}
            </Typography>
            <List disablePadding>
              {section.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <ListItemButton
                    key={item.href}
                    component={Link}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    sx={{
                      py: 0.85,
                      color: active ? 'primary.main' : 'text.secondary',
                      bgcolor: active ? 'rgba(0, 167, 111, 0.08)' : 'transparent',
                      '&:hover': {
                        bgcolor: active ? 'rgba(0, 167, 111, 0.12)' : 'action.hover',
                      },
                      ...(active && {
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      }),
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: active ? 700 : 500,
                        fontSize: '0.875rem',
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
            {idx < NAV_SECTIONS.length - 1 && <Divider sx={{ mt: 1.5, mx: 1 }} />}
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <UserMenu />
      </Box>
    </Box>
  );

  return (
    <AuthGuard>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {isMobile ? (
          <Drawer
            open={open}
            onClose={() => setOpen(false)}
            PaperProps={{ sx: { width: NAV_WIDTH } }}
          >
            {sidebar}
          </Drawer>
        ) : (
          <Box
            component="nav"
            sx={{
              width: NAV_WIDTH,
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 0,
              height: '100vh',
            }}
          >
            {sidebar}
          </Box>
        )}

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            {isMobile && (
              <IconButton onClick={() => setOpen(true)} edge="start" size="small">
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
              {pageTitle}
            </Typography>
            {!isMobile && (
              <Chip
                label="SDLC Copilot"
                size="small"
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          <Box
            component="main"
            sx={{
              flex: 1,
              p: { xs: 2, md: 3 },
              bgcolor: 'background.default',
            }}
          >
            <Box sx={{ maxWidth: 1440, mx: 'auto', width: '100%' }}>{children}</Box>
          </Box>
        </Box>
      </Box>
    </AuthGuard>
  );
}

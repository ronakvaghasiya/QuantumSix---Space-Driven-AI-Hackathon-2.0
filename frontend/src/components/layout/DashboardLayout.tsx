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
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MenuIcon from '@mui/icons-material/Menu';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TuneIcon from '@mui/icons-material/Tune';
import { ReactNode, useState } from 'react';
import { BRAND } from '@/lib/brand';

const NAV_WIDTH = 280;

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
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Integrations', href: '/settings', icon: <TuneIcon fontSize="small" /> },
    ],
  },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/settings') return pathname === '/settings';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [open, setOpen] = useState(false);

  const sidebar = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
            <AutoAwesomeIcon fontSize="small" />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
              {BRAND.name}
            </Typography>
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, display: 'block' }}>
              {BRAND.tagline}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {BRAND.orgLine}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 1.5 }}>
        {NAV_SECTIONS.map((section) => (
          <Box key={section.title} sx={{ mb: 1.5 }}>
            <Typography variant="overline" sx={{ px: 1.5, py: 0.75, display: 'block' }}>
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
                        variant: 'subtitle2',
                        fontWeight: active ? 700 : 500,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
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
        {isMobile && (
          <Box
            sx={{
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <IconButton onClick={() => setOpen(true)} edge="start" size="small" aria-label="Open menu">
              <MenuIcon />
            </IconButton>
          </Box>
        )}

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
  );
}

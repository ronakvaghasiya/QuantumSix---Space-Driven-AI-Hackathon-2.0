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
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useState } from 'react';

const NAV_WIDTH = 280;

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: <DashboardIcon /> },
  { label: 'Projects', href: '/projects', icon: <FolderIcon /> },
  { label: 'Tasks', href: '/tasks', icon: <AssignmentIcon /> },
  { label: 'Reports', href: '/reports', icon: <AssessmentIcon /> },
  { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [open, setOpen] = useState(false);

  const sidebar = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2.5, py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <AutoAwesomeIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
             QuantumSix
            </Typography>
            <Typography variant="caption" color="text.secondary">
              AI Engineering Copilot
            </Typography>
          </Box>
        </Stack>
      </Box>

      <List sx={{ px: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={() => setOpen(false)}
              sx={{
                mb: 0.5,
                borderRadius: 1,
                color: active ? 'primary.main' : 'text.secondary',
                bgcolor: active ? 'rgba(0, 167, 111, 0.08)' : 'transparent',
                '&:hover': { bgcolor: active ? 'rgba(0, 167, 111, 0.08)' : 'action.hover' },
                ...(active && {
                  fontWeight: 700,
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                }),
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '0.875rem' }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          QuantumSix Hackathon 2.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: NAV_WIDTH } }}>
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
          }}
        >
          {sidebar}
        </Box>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {isMobile && (
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <IconButton onClick={() => setOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        )}
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 }, bgcolor: 'background.default' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

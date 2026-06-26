'use client';

import { IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '@/contexts/ThemeModeContext';

export function ThemeToggle({ size = 'small' }: { size?: 'small' | 'medium' }) {
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        size={size}
        onClick={toggleMode}
        aria-label="Toggle light and dark mode"
        sx={{
          color: 'text.secondary',
          bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.08),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.14),
            color: 'primary.main',
            transform: 'rotate(12deg) scale(1.05)',
          },
        }}
      >
        {isDark ? (
          <LightModeOutlinedIcon fontSize={size} />
        ) : (
          <DarkModeOutlinedIcon fontSize={size} />
        )}
      </IconButton>
    </Tooltip>
  );
}

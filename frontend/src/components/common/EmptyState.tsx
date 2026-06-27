'use client';

import React from 'react';
import { Box, Typography, Button, Stack, useTheme, alpha } from '@mui/material';
import { keyframes } from '@emotion/react';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import RefreshIcon from '@mui/icons-material/Refresh';

// Define smooth premium animations using emotion keyframes
const float = keyframes`
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-12px) rotate(6deg);
  }
`;

const radarSweep = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulseScale = keyframes`
  0%, 100% {
    transform: scale(0.96);
    opacity: 0.25;
  }
  50% {
    transform: scale(1.04);
    opacity: 0.6;
  }
`;

const twinkle = keyframes`
  0%, 100% {
    transform: scale(0.4);
    opacity: 0.15;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.85;
  }
`;

interface EmptyStateProps {
  title?: string;
  description?: string;
  onClearSearch?: () => void;
  actionText?: string;
}

export default function EmptyState({
  title = 'No Records Found',
  description = 'We couldn\'t find any matching data. Try adjusting your search query or clear the filter.',
  onClearSearch,
  actionText = 'Clear Search',
}: EmptyStateProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 7,
        px: 3,
        borderRadius: 4,
        border: '1px dashed',
        borderColor: isDark ? 'rgba(145, 158, 171, 0.16)' : 'rgba(145, 158, 171, 0.24)',
        bgcolor: isDark ? 'rgba(22, 28, 36, 0.4)' : 'rgba(244, 246, 248, 0.5)',
        backdropFilter: 'blur(8px)',
        textAlign: 'center',
        maxWidth: 620,
        mx: 'auto',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isDark
          ? 'inset 0 0 20px 0 rgba(0,0,0,0.2)'
          : 'inset 0 0 20px 0 rgba(145,158,171,0.05)',
      }}
    >
      {/* Decorative Star 1 */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          left: '15%',
          animation: `${twinkle} 3s infinite ease-in-out`,
          color: theme.palette.primary.light,
          opacity: 0.7,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </Box>

      {/* Decorative Star 2 */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          animation: `${twinkle} 4s infinite ease-in-out`,
          animationDelay: '1s',
          color: theme.palette.secondary.light,
          opacity: 0.6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </Box>

      {/* Decorative Star 3 */}
      <Box
        sx={{
          position: 'absolute',
          top: '25%',
          right: '18%',
          animation: `${twinkle} 2.5s infinite ease-in-out`,
          animationDelay: '1.5s',
          color: theme.palette.info.light,
          opacity: 0.5,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </Box>

      {/* Primary Animation Area (Radar Scanner & Floating Glass) */}
      <Box
        sx={{
          position: 'relative',
          width: 160,
          height: 160,
          mb: 4,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {/* Glowing aura */}
        <Box
          sx={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: '50%',
            filter: 'blur(30px)',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.25)} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />

        {/* Radar concentric circle 1 */}
        <Box
          sx={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: '50%',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
            animation: `${pulseScale} 4s infinite ease-in-out`,
          }}
        />

        {/* Radar concentric circle 2 */}
        <Box
          sx={{
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: `1.5px dashed ${alpha(theme.palette.primary.main, 0.15)}`,
            animation: `${pulseScale} 4s infinite ease-in-out`,
            animationDelay: '1s',
          }}
        />

        {/* Radar concentric circle 3 */}
        <Box
          sx={{
            position: 'absolute',
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            bgcolor: isDark ? 'rgba(0, 167, 111, 0.03)' : 'rgba(0, 167, 111, 0.02)',
          }}
        />

        {/* Radar sweeping scan line */}
        <Box
          sx={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: '50%',
            animation: `${radarSweep} 6s linear infinite`,
            pointerEvents: 'none',
            background: `conic-gradient(from 0deg, ${alpha(theme.palette.primary.main, 0.18)} 0deg, ${alpha(theme.palette.primary.main, 0.04)} 120deg, transparent 240deg, transparent 360deg)`,
          }}
        />

        {/* Sweeping dot */}
        <Box
          sx={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: '50%',
            animation: `${radarSweep} 6s linear infinite`,
            pointerEvents: 'none',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: theme.palette.primary.main,
              boxShadow: `0 0 12px 3px ${theme.palette.primary.main}`,
            },
          }}
        />

        {/* Floating glassmorphic search node */}
        <Box
          sx={{
            position: 'absolute',
            zIndex: 2,
            width: 56,
            height: 56,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            backdropFilter: 'blur(6px)',
            boxShadow: theme.shadows[8],
            color: theme.palette.primary.main,
            animation: `${float} 4.5s infinite ease-in-out`,
          }}
        >
          <SearchOffIcon sx={{ fontSize: 32 }} />
        </Box>
      </Box>

      {/* Text Info */}
      <Stack spacing={1} sx={{ position: 'relative', zIndex: 3, mb: onClearSearch ? 3.5 : 0 }}>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Stack>

      {/* Action Button */}
      {onClearSearch && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={onClearSearch}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'none',
            transition: 'all 0.2s ease',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.08)}`,
            borderColor: alpha(theme.palette.primary.main, 0.3),
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              transform: 'translateY(-1px)',
              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.16)}`,
            },
          }}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
}

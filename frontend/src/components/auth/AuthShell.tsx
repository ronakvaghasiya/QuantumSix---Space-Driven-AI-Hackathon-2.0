'use client';

import { Box, Stack, Typography, alpha } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { ReactNode } from 'react';
import { BRAND } from '@/lib/brand';

export function AuthShell({ children, title, subtitle }: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '48%',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          background: `linear-gradient(145deg, #007867 0%, #00A76F 45%, #8E33FF 100%)`,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.08),
            top: -120,
            right: -80,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.06),
            bottom: -60,
            left: -40,
          }}
        />

        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              bgcolor: alpha('#fff', 0.15),
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <AutoAwesomeIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {BRAND.organization}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {BRAND.name} · {BRAND.edition}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ position: 'relative', maxWidth: 440 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.15 }}>
            AI-Powered SDLC for your whole team
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.92, lineHeight: 1.7 }}>
            Index repos, run autonomous agents, and ship faster — on Windows, Ubuntu, or macOS.
            One login. Same workflow everywhere.
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ opacity: 0.75, position: 'relative' }}>
          © {new Date().getFullYear()} {BRAND.organization} Team
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Stack spacing={1} sx={{ mb: 4, display: { md: 'none' } }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AutoAwesomeIcon color="primary" />
              <Typography variant="h5" fontWeight={800}>
                {BRAND.organization}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {BRAND.name}
            </Typography>
          </Stack>

          <Typography variant="h4" fontWeight={800} gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

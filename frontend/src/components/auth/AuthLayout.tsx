'use client';

import { ReactNode } from 'react';
import { Box, Card, CardContent, Typography, Avatar, Stack } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: 'linear-gradient(135deg, #E8FBF3 0%, #F4F6F8 45%, #EDE7FF 100%)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
            <AutoAwesomeIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>
            RepoPilot AI
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            AI-powered autonomous SDLC platform
          </Typography>
        </Stack>

        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {subtitle}
            </Typography>
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

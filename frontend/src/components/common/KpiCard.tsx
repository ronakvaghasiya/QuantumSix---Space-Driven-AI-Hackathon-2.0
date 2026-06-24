'use client';

import { Card, CardContent, Stack, Typography, Box, Skeleton } from '@mui/material';
import { ReactNode } from 'react';
import { colorAlpha, resolveThemeColor } from '@/theme';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  loading?: boolean;
}

export function KpiCard({ title, value, icon, color = 'primary.main', loading }: KpiCardProps) {
  const resolved = resolveThemeColor(color);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom noWrap>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={72} height={44} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {value}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: colorAlpha(color, 0.12),
              color: resolved,
              '& svg': { fontSize: 28 },
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}

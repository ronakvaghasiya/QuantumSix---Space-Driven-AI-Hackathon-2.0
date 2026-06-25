'use client';

import {
  Box,
  Card,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MergeTypeOutlinedIcon from '@mui/icons-material/MergeTypeOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import type { ReactNode } from 'react';
import { BRAND } from '@/lib/brand';

const FEATURES = [
  {
    icon: <AccountTreeOutlinedIcon fontSize="small" />,
    title: 'Autonomous pipeline',
    desc: 'Analysis → code → validation → GitLab MR',
  },
  {
    icon: <SmartToyOutlinedIcon fontSize="small" />,
    title: 'AI agents',
    desc: 'Requirement, impact, QA & code generation',
  },
  {
    icon: <MergeTypeOutlinedIcon fontSize="small" />,
    title: 'GitLab native',
    desc: 'Clone, index, branch & merge requests',
  },
];

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'grey.100',
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 100% 0%, ${alpha('#00A76F', 0.12)} 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 0% 100%, ${alpha('#8E33FF', 0.06)} 0%, transparent 50%)
        `,
      }}
    >
      {/* Brand panel */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: { lg: '44%', xl: '42%' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { lg: 5, xl: 6 },
          bgcolor: 'grey.900',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.35,
            backgroundImage: `radial-gradient(${alpha('#00A76F', 0.35)} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha('#00A76F', 0.25)} 0%, transparent 70%)`,
            top: -160,
            right: -120,
          }}
        />

        <Stack direction="row" alignItems="center" spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${alpha('#00A76F', 0.9)} 0%, #007867 100%)`,
              display: 'grid',
              placeItems: 'center',
              boxShadow: `0 8px 24px ${alpha('#00A76F', 0.35)}`,
            }}
          >
            <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              {BRAND.name}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.72), fontWeight: 600 }}>
              {BRAND.tagline}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 400, py: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: 2,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              fontSize: { lg: '2rem', xl: '2.35rem' },
            }}
          >
            Ship code with an AI SDLC copilot
          </Typography>
          <Typography variant="body1" sx={{ color: alpha('#fff', 0.78), lineHeight: 1.75, mb: 4 }}>
            {BRAND.description}
          </Typography>

          <Stack spacing={2}>
            {FEATURES.map((f) => (
              <Stack key={f.title} direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: alpha('#00A76F', 0.15),
                    color: '#5BE49B',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    border: `1px solid ${alpha('#00A76F', 0.25)}`,
                  }}
                >
                  {f.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>
                    {f.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.65) }}>
                    {f.desc}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Typography variant="caption" sx={{ color: alpha('#fff', 0.45), position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} {BRAND.organization} · {BRAND.edition}
        </Typography>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, sm: 4, lg: 5 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mb: 3, display: { lg: 'none' } }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <AutoAwesomeIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                {BRAND.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {BRAND.tagline}
              </Typography>
            </Box>
          </Stack>

          <Card
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: alpha('#919EAB', 0.16),
              boxShadow: `0 12px 40px ${alpha('#141A21', 0.08)}`,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 4,
                borderRadius: 2,
                bgcolor: 'primary.main',
                mb: 2.5,
              }}
            />
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.75 }}
            >
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              {subtitle}
            </Typography>
            {children}
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

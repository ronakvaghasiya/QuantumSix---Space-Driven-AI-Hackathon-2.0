'use client';

import Link from 'next/link';
import { Typography } from '@mui/material';

export function AuthFormLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Typography
        component="span"
        variant="body2"
        sx={{
          color: 'primary.main',
          fontWeight: 700,
          '&:hover': { color: 'primary.dark', textDecoration: 'underline' },
        }}
      >
        {children}
      </Typography>
    </Link>
  );
}

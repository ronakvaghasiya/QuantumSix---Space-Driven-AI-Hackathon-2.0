'use client';

import { Avatar, Button, Chip, Stack, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useRouter } from 'next/navigation';
import { clearSession, getStoredUser, isAuthEnabled } from '@/lib/auth';

export function UserMenu() {
  const router = useRouter();
  const user = getStoredUser();

  const logout = () => {
    clearSession();
    router.push('/login');
  };

  if (!isAuthEnabled()) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(0, 167, 111, 0.16)', color: 'primary.main' }}>
          <PersonIcon fontSize="small" />
        </Avatar>
        <BoxMeta name="Local Dev" role="system" />
        <Chip label="Auth off" size="small" variant="outlined" />
      </Stack>
    );
  }

  if (!user) return null;

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
        {user.name.charAt(0).toUpperCase()}
      </Avatar>
      <BoxMeta name={user.name} role={user.role} />
      <Button size="small" startIcon={<LogoutIcon />} onClick={logout} sx={{ ml: 'auto' }}>
        Logout
      </Button>
    </Stack>
  );
}

function BoxMeta({ name, role }: { name: string; role: string }) {
  return (
    <Stack sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant="body2" fontWeight={600} noWrap>
        {name}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        {role.replace(/_/g, ' ')}
      </Typography>
    </Stack>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  MenuItem,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Skeleton,
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { PageHeader } from '@/components/common/KpiCard';
import { api, OrganizationMember } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { getStoredUser } from '@/lib/auth';

const ROLES = ['org_admin', 'developer', 'qa', 'manager', 'viewer'];

const ROLE_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  org_admin: 'primary',
  developer: 'info',
  qa: 'warning',
  manager: 'secondary',
  viewer: 'default',
};

export default function OrgMembersPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.organizations.members(), api.auth.me()])
      .then(([m, profile]) => {
        setMembers(m);
        setPermissions(profile.permissions);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const invite = async () => {
    setInviting(true);
    setError('');
    try {
      await api.organizations.invite({ email, role });
      setEmail('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <PageHeader title="Organization Members" subtitle="Manage team access, roles, and invitations" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <PermissionGate permission={Permission.MANAGE_USERS} permissions={permissions}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <GroupAddIcon color="primary" fontSize="small" />
              <Typography variant="h6">Invite member</Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                placeholder="teammate@company.com"
              />
              <TextField
                select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                onClick={invite}
                disabled={inviting || !email}
                sx={{ minWidth: 120, alignSelf: { sm: 'center' } }}
              >
                {inviting ? 'Sending…' : 'Invite'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </PermissionGate>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Typography variant="h6" sx={{ px: 3, pt: 3, pb: 2 }}>
            Team members ({members.length})
          </Typography>
          {loading ? (
            <Stack spacing={1} sx={{ px: 3, pb: 3 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} height={48} />)}
            </Stack>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No members yet. Invite your first teammate above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => {
                      const isYou = m.user.id === getStoredUser()?.id;
                      return (
                        <TableRow key={m.id} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                                {m.user.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>
                                {m.user.name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {m.user.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={m.role.replace(/_/g, ' ')}
                              size="small"
                              color={ROLE_COLORS[m.role] || 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {isYou && <Chip label="You" size="small" color="primary" />}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}

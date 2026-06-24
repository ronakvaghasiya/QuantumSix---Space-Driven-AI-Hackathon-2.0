'use client';

import { ReactNode } from 'react';
import { Permission } from '@/lib/permissions';

interface Props {
  permission: Permission;
  permissions?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, permissions, children, fallback = null }: Props) {
  if (!permissions?.length) return <>{children}</>;
  if (permissions.includes(permission)) return <>{children}</>;
  return <>{fallback}</>;
}

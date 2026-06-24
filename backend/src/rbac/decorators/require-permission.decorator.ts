import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../common/enums/organization.enum';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

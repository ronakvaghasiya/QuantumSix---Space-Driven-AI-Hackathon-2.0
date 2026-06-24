import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  providers: [RbacService, PermissionsGuard],
  exports: [RbacService, PermissionsGuard],
})
export class RbacModule {}

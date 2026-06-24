import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityScan } from './entities/security-scan.entity';
import { OrganizationIpAllowlist } from './entities/organization-ip-allowlist.entity';
import { RepositoryAccessLog } from './entities/repository-access-log.entity';
import { SecurityScanService } from './security-scan.service';
import { IpRestrictionService } from './ip-restriction.service';
import { RepositoryAccessLogService } from './repository-access-log.service';
import { SecurityAdminController } from './security-admin.controller';
import { Organization } from '../organizations/entities/organization.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SecurityScan,
      OrganizationIpAllowlist,
      RepositoryAccessLog,
      Organization,
    ]),
    RbacModule,
  ],
  controllers: [SecurityAdminController],
  providers: [SecurityScanService, IpRestrictionService, RepositoryAccessLogService],
  exports: [SecurityScanService, IpRestrictionService, RepositoryAccessLogService, TypeOrmModule],
})
export class SecurityModule {}

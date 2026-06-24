import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { TenancyBootstrapService } from './tenancy-bootstrap.service';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { User } from '../auth/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      User,
      Project,
      Task,
    ]),
    RbacModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, TenancyBootstrapService],
  exports: [OrganizationsService, TenancyBootstrapService],
})
export class OrganizationsModule {}

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Project } from '../projects/entities/project.entity';
import { TenancyService } from '../tenancy/tenancy.service';

const DEFAULT_ORG_SLUG = 'default';
const DEFAULT_ORG_NAME = 'Default Organization';

@Injectable()
export class TenancyBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(TenancyBootstrapService.name);

  constructor(
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    private readonly tenancy: TenancyService,
  ) {}

  async onModuleInit(): Promise<void> {
    let org = await this.orgRepo.findOne({ where: { slug: DEFAULT_ORG_SLUG } });
    if (!org) {
      org = await this.orgRepo.save(
        this.orgRepo.create({
          name: DEFAULT_ORG_NAME,
          slug: DEFAULT_ORG_SLUG,
        }),
      );
      this.logger.log(`Created default organization: ${org.id}`);
    }

    const orphans = await this.projectRepo.find({ where: { organizationId: IsNull() } });
    if (orphans.length > 0) {
      await this.projectRepo.update(
        { organizationId: IsNull() },
        { organizationId: org.id },
      );
      this.logger.log(`Attached ${orphans.length} projects to default organization`);
    }

    this.tenancy.setDefaultOrganizationId(org.id);
    this.logger.log(`Tenancy bootstrap complete. Default org: ${org.id}`);
  }
}

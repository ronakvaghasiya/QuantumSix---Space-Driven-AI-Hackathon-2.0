import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { User } from '../auth/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { InviteMemberDto, UpdateMemberRoleDto, UpdateOrganizationDto } from './dto/organization.dto';
import { OrganizationRole } from '../common/enums/organization.enum';
import { TenancyService } from '../tenancy/tenancy.service';
import { isSystemUser } from '../auth/system-user';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember) private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    private readonly tenancy: TenancyService,
  ) {}

  async findForUser(userId: string): Promise<Organization[]> {
    if (isSystemUser(userId)) {
      const orgId = this.tenancy.getDefaultOrganizationId();
      if (!orgId) return [];
      const org = await this.orgRepo.findOne({ where: { id: orgId } });
      return org ? [org] : [];
    }

    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['organization'],
    });
    return memberships.map((m) => m.organization);
  }

  async findOne(orgId: string, userId: string): Promise<Organization> {
    await this.assertMembership(userId, orgId);
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(orgId: string, userId: string, dto: UpdateOrganizationDto): Promise<Organization> {
    await this.assertAdmin(userId, orgId);
    const org = await this.findOne(orgId, userId);
    if (dto.name) org.name = dto.name;
    return this.orgRepo.save(org);
  }

  async listMembers(orgId: string, userId: string) {
    await this.assertMembership(userId, orgId);
    return this.memberRepo.find({
      where: { organizationId: orgId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async inviteMember(orgId: string, actorId: string, dto: InviteMemberDto) {
    await this.assertAdmin(actorId, orgId);

    let user = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      const tempPassword = await bcrypt.hash(`invite-${Date.now()}`, 10);
      user = await this.userRepo.save(
        this.userRepo.create({
          email: dto.email.toLowerCase(),
          name: dto.name || dto.email.split('@')[0],
          passwordHash: tempPassword,
        }),
      );
    }

    const existing = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: user.id },
    });
    if (existing) throw new ConflictException('User is already a member');

    return this.memberRepo.save(
      this.memberRepo.create({
        organizationId: orgId,
        userId: user.id,
        role: dto.role,
        invitedAt: new Date(),
        joinedAt: new Date(),
      }),
    );
  }

  async updateMemberRole(
    orgId: string,
    actorId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.assertAdmin(actorId, orgId);
    const member = await this.memberRepo.findOne({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException('Member not found');
    member.role = dto.role;
    return this.memberRepo.save(member);
  }

  async assertProjectInOrg(projectId: string, orgId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId, organizationId: orgId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    return project;
  }

  async assertTaskInOrg(taskId: string, orgId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project'],
    });
    if (!task || task.project?.organizationId !== orgId) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    return task;
  }

  private async assertMembership(userId: string, orgId: string): Promise<OrganizationMember> {
    if (isSystemUser(userId)) {
      return { organizationId: orgId, userId, role: OrganizationRole.ORG_ADMIN } as OrganizationMember;
    }
    const member = await this.memberRepo.findOne({ where: { userId, organizationId: orgId } });
    if (!member) throw new ForbiddenException('Not a member of this organization');
    return member;
  }

  private async assertAdmin(userId: string, orgId: string): Promise<void> {
    const member = await this.assertMembership(userId, orgId);
    if (
      member.role !== OrganizationRole.ORG_ADMIN &&
      member.role !== OrganizationRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Organization admin required');
    }
  }
}

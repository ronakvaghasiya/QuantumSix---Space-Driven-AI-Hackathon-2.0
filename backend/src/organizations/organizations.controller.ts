import { Controller, Get, Put, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { InviteMemberDto, UpdateMemberRoleDto, UpdateOrganizationDto } from './dto/organization.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organizations for current user' })
  list(@CurrentUser() user: AuthUser) {
    return this.orgsService.findForUser(user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current organization' })
  current(@CurrentUser() user: AuthUser) {
    return this.orgsService.findOne(user.organizationId, user.id);
  }

  @Put('current')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Update current organization' })
  updateCurrent(@CurrentUser() user: AuthUser, @Body() dto: UpdateOrganizationDto) {
    return this.orgsService.update(user.organizationId, user.id, dto);
  }

  @Get('current/members')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'List organization members' })
  members(@CurrentUser() user: AuthUser) {
    return this.orgsService.listMembers(user.organizationId, user.id);
  }

  @Post('current/members')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Invite member to organization' })
  invite(@CurrentUser() user: AuthUser, @Body() dto: InviteMemberDto) {
    return this.orgsService.inviteMember(user.organizationId, user.id, dto);
  }

  @Put('current/members/:memberId')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Update member role' })
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(user.organizationId, user.id, memberId, dto);
  }
}

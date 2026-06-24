import { IsString, MinLength, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '../../common/enums/organization.enum';

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role: OrganizationRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

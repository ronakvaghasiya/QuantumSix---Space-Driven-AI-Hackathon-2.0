import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const CLIENT_PLATFORMS = ['windows', 'linux', 'macos', 'other'] as const;
export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];

export class RegisterDto {
  @ApiProperty({ example: 'suraj@quantumsix.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Suraj' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: CLIENT_PLATFORMS })
  @IsOptional()
  @IsIn(CLIENT_PLATFORMS)
  clientPlatform?: ClientPlatform;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ enum: CLIENT_PLATFORMS })
  @IsOptional()
  @IsIn(CLIENT_PLATFORMS)
  clientPlatform?: ClientPlatform;
}

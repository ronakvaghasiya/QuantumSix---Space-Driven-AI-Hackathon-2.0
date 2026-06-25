import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '../auth/entities/user.entity';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('runtime')
  @ApiOperation({ summary: 'OS-aware runtime hints for this machine' })
  runtime(@Req() req: { user: User }) {
    return this.platformService.getRuntimeConfig(req.user.lastClientPlatform);
  }
}

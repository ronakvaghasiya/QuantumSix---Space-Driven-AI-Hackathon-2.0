import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Seed')
@Public()
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  @ApiOperation({ summary: 'Seed demo data (BannerBuzz)' })
  seed() {
    return this.seedService.seedDemoData();
  }
}

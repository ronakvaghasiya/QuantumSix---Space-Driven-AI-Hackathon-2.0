import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard KPI stats' })
  getDashboard() {
    return this.reportsService.getDashboardStats();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data' })
  getAnalytics() {
    return this.reportsService.getAnalytics();
  }

  @Get('recent-prs')
  @ApiOperation({ summary: 'Get recent pull requests' })
  getRecentPrs(@Query('limit') limit?: number) {
    return this.reportsService.getRecentPullRequests(limit ? Number(limit) : 5);
  }
}

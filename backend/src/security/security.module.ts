import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityScan } from './entities/security-scan.entity';
import { SecurityScanService } from './security-scan.service';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityScan])],
  providers: [SecurityScanService],
  exports: [SecurityScanService, TypeOrmModule],
})
export class SecurityModule {}

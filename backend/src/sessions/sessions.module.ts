import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserSession } from './entities/user-session.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserSession]), VaultModule, JwtModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionsModule {}

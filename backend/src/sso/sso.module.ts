import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SsoProvider } from './entities/sso-provider.entity';
import { SsoIdentity } from './entities/sso-identity.entity';
import { SsoService } from './sso.service';
import { SsoController } from './sso.controller';
import { User } from '../auth/entities/user.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SsoProvider, SsoIdentity, User, OrganizationMember]),
    SessionsModule,
    RbacModule,
    JwtModule,
  ],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}

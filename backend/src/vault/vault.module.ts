import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultSecret } from './entities/vault-secret.entity';
import { VaultService } from './vault.service';
import { VaultCryptoService } from './vault-crypto.service';
import { VaultController } from './vault.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [TypeOrmModule.forFeature([VaultSecret]), RbacModule],
  controllers: [VaultController],
  providers: [VaultService, VaultCryptoService],
  exports: [VaultService, VaultCryptoService],
})
export class VaultModule {}

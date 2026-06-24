import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VaultSecret } from './entities/vault-secret.entity';
import { VaultCryptoService } from './vault-crypto.service';

export interface VaultSecretSummary {
  id: string;
  keyName: string;
  keyVersion: number;
  preview: string;
  updatedAt: Date;
}

@Injectable()
export class VaultService {
  constructor(
    @InjectRepository(VaultSecret)
    private readonly secretRepo: Repository<VaultSecret>,
    private readonly crypto: VaultCryptoService,
  ) {}

  async list(organizationId: string): Promise<VaultSecretSummary[]> {
    const secrets = await this.secretRepo.find({
      where: { organizationId },
      order: { keyName: 'ASC' },
    });
    return secrets.map((s) => ({
      id: s.id,
      keyName: s.keyName,
      keyVersion: s.keyVersion,
      preview: '••••••••',
      updatedAt: s.updatedAt,
    }));
  }

  async upsert(organizationId: string, keyName: string, value: string): Promise<VaultSecretSummary> {
    const { encryptedValue, iv } = this.crypto.encrypt(value);
    let secret = await this.secretRepo.findOne({ where: { organizationId, keyName } });
    if (secret) {
      secret.encryptedValue = encryptedValue;
      secret.iv = iv;
      secret.keyVersion += 1;
    } else {
      secret = this.secretRepo.create({
        organizationId,
        keyName,
        encryptedValue,
        iv,
      });
    }
    const saved = await this.secretRepo.save(secret);
    return {
      id: saved.id,
      keyName: saved.keyName,
      keyVersion: saved.keyVersion,
      preview: '••••••••',
      updatedAt: saved.updatedAt,
    };
  }

  async getDecrypted(organizationId: string, keyName: string): Promise<string | null> {
    const secret = await this.secretRepo.findOne({ where: { organizationId, keyName } });
    if (!secret) return null;
    return this.crypto.decrypt(secret.encryptedValue, secret.iv);
  }

  async delete(organizationId: string, keyName: string): Promise<void> {
    const result = await this.secretRepo.delete({ organizationId, keyName });
    if (!result.affected) throw new NotFoundException('Secret not found');
  }
}

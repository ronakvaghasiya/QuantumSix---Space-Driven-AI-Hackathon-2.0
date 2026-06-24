import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGO = 'aes-256-gcm';

@Injectable()
export class VaultCryptoService {
  constructor(private readonly config: ConfigService) {}

  private deriveKey(): Buffer {
    const master = this.config.get<string>('VAULT_MASTER_KEY');
    if (!master || master.length < 16) {
      throw new BadRequestException(
        'VAULT_MASTER_KEY must be set (min 16 chars) to use secrets vault',
      );
    }
    return createHash('sha256').update(master).digest();
  }

  encrypt(plaintext: string): { encryptedValue: string; iv: string } {
    const key = this.deriveKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([encrypted, tag]).toString('base64');
    return { encryptedValue: payload, iv: iv.toString('base64') };
  }

  decrypt(encryptedValue: string, iv: string): string {
    const key = this.deriveKey();
    const ivBuf = Buffer.from(iv, 'base64');
    const data = Buffer.from(encryptedValue, 'base64');
    const tag = data.subarray(data.length - 16);
    const ciphertext = data.subarray(0, data.length - 16);
    const decipher = createDecipheriv(ALGO, key, ivBuf);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { UserSession } from './entities/user-session.entity';
import { VaultCryptoService } from '../vault/vault-crypto.service';
import { isSystemUser } from '../auth/system-user';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    private readonly crypto: VaultCryptoService,
  ) {}

  async createSession(params: {
    userId: string;
    organizationId: string;
    jti: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<UserSession> {
    return this.sessionRepo.save(
      this.sessionRepo.create({
        userId: params.userId,
        organizationId: params.organizationId,
        tokenHash: this.crypto.hashToken(params.jti),
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        expiresAt: params.expiresAt,
      }),
    );
  }

  async assertActive(jti: string): Promise<void> {
    const hash = this.crypto.hashToken(jti);
    const session = await this.sessionRepo.findOne({ where: { tokenHash: hash } });
    if (!session) throw new UnauthorizedException('Session not found');
    if (session.revokedAt) throw new UnauthorizedException('Session revoked');
    if (session.expiresAt < new Date()) throw new UnauthorizedException('Session expired');
  }

  async listForUser(userId: string): Promise<UserSession[]> {
    if (isSystemUser(userId)) return [];
    return this.sessionRepo.find({
      where: { userId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(sessionId: string, userId: string): Promise<void> {
    if (isSystemUser(userId)) return;
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    session.revokedAt = new Date();
    await this.sessionRepo.save(session);
  }

  async revokeAllExcept(userId: string, currentJti: string): Promise<number> {
    if (isSystemUser(userId)) return 0;
    const currentHash = this.crypto.hashToken(currentJti);
    const sessions = await this.sessionRepo.find({
      where: { userId, revokedAt: IsNull(), tokenHash: Not(currentHash) },
    });
    const now = new Date();
    for (const s of sessions) {
      s.revokedAt = now;
    }
    if (sessions.length) await this.sessionRepo.save(sessions);
    return sessions.length;
  }

  async revokeByJti(jti: string): Promise<void> {
    const hash = this.crypto.hashToken(jti);
    const session = await this.sessionRepo.findOne({ where: { tokenHash: hash } });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await this.sessionRepo.save(session);
    }
  }
}

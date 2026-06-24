import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationIpAllowlist } from './entities/organization-ip-allowlist.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationPlan } from '../common/enums/organization.enum';

@Injectable()
export class IpRestrictionService {
  constructor(
    @InjectRepository(OrganizationIpAllowlist)
    private readonly allowlistRepo: Repository<OrganizationIpAllowlist>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async list(organizationId: string): Promise<OrganizationIpAllowlist[]> {
    return this.allowlistRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
  }

  async add(organizationId: string, cidr: string, label?: string): Promise<OrganizationIpAllowlist> {
    return this.allowlistRepo.save(
      this.allowlistRepo.create({ organizationId, cidr: cidr.trim(), label: label || null }),
    );
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.allowlistRepo.delete({ id, organizationId });
  }

  async assertIpAllowed(organizationId: string, ip: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org || org.plan !== OrganizationPlan.ENTERPRISE) return;

    const rules = await this.allowlistRepo.find({
      where: { organizationId, enabled: true },
    });
    if (!rules.length) return;

    const normalized = this.normalizeIp(ip);
    const allowed = rules.some((r) => this.ipMatchesCidr(normalized, r.cidr));
    if (!allowed) {
      throw new ForbiddenException('Access denied: IP not in organization allowlist');
    }
  }

  private normalizeIp(ip: string): string {
    if (ip === '::1') return '127.0.0.1';
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    return ip;
  }

  private ipMatchesCidr(ip: string, cidr: string): boolean {
    if (!cidr.includes('/')) {
      return ip === cidr || cidr === '*';
    }
    const [range, bitsStr] = cidr.split('/');
    const bits = Number(bitsStr);
    if (Number.isNaN(bits) || bits < 0 || bits > 32) return false;

    const ipNum = this.ipv4ToInt(ip);
    const rangeNum = this.ipv4ToInt(range);
    if (ipNum === null || rangeNum === null) return false;

    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
  }

  private ipv4ToInt(ip: string): number | null {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface SecurityScanResult {
  status: 'pass' | 'fail' | 'warning';
  secretsFound: number;
  vulnerabilities: { severity: string; title: string; detail: string }[];
  unsafePatterns: { file: string; pattern: string; line?: number }[];
  blockedPr: boolean;
  summary: string;
}

const SECRET_PATTERNS = [
  { name: 'OPENAI_API_KEY', re: /sk-[a-zA-Z0-9]{20,}/g },
  { name: 'HUGGINGFACE_TOKEN', re: /hf_[a-zA-Z0-9]{20,}/g },
  { name: 'GITHUB_TOKEN', re: /ghp_[a-zA-Z0-9]{20,}/g },
  { name: 'GITLAB_TOKEN', re: /glpat-[a-zA-Z0-9\-_]{20,}/g },
  { name: 'JWT_SECRET', re: /jwt[_-]?secret\s*[:=]\s*['"][^'"]{8,}['"]/gi },
  { name: 'GENERIC_API_KEY', re: /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/gi },
];

const UNSAFE_PATTERNS = [
  { name: 'eval()', re: /\beval\s*\(/g },
  { name: 'new Function()', re: /new\s+Function\s*\(/g },
  { name: 'child_process.exec', re: /child_process\.exec\s*\(/g },
  { name: 'execSync', re: /\.execSync\s*\(/g },
];

@Injectable()
export class SecurityScanService {
  private readonly logger = new Logger(SecurityScanService.name);

  async scanRepository(cwd: string): Promise<SecurityScanResult> {
    const secrets: SecurityScanResult['unsafePatterns'] = [];
    const unsafe: SecurityScanResult['unsafePatterns'] = [];
    let secretsFound = 0;

    this.walkSourceFiles(cwd, (file, content) => {
      const rel = path.relative(cwd, file);
      if (rel.includes('node_modules') || rel.includes('.git')) return;

      for (const pat of SECRET_PATTERNS) {
        if (pat.re.test(content)) {
          secretsFound++;
          secrets.push({ file: rel, pattern: pat.name });
        }
        pat.re.lastIndex = 0;
      }

      const lines = content.split('\n');
      for (const pat of UNSAFE_PATTERNS) {
        lines.forEach((line, idx) => {
          if (pat.re.test(line)) {
            unsafe.push({ file: rel, pattern: pat.name, line: idx + 1 });
          }
          pat.re.lastIndex = 0;
        });
      }
    });

    const vulnerabilities = await this.runNpmAudit(cwd);
    const criticalVulns = vulnerabilities.filter((v) => v.severity === 'critical').length;
    const highVulns = vulnerabilities.filter((v) => v.severity === 'high').length;

    const blockedPr = secretsFound > 0 || criticalVulns > 0;
    let status: SecurityScanResult['status'] = 'pass';
    if (blockedPr) status = 'fail';
    else if (highVulns > 0 || unsafe.length > 0) status = 'warning';

    const parts = [
      `Secrets: ${secretsFound}`,
      `Unsafe patterns: ${unsafe.length}`,
      `Vulnerabilities: ${vulnerabilities.length} (${criticalVulns} critical)`,
    ];

    return {
      status,
      secretsFound,
      vulnerabilities,
      unsafePatterns: [...secrets, ...unsafe],
      blockedPr,
      summary: parts.join(' · '),
    };
  }

  private async runNpmAudit(cwd: string): Promise<SecurityScanResult['vulnerabilities']> {
    if (!fs.existsSync(path.join(cwd, 'package.json'))) return [];
    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd,
        timeout: 120_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      const json = JSON.parse(stdout) as {
        vulnerabilities?: Record<
          string,
          { severity: string; name: string; via?: { title?: string }[] }
        >;
      };
      return Object.entries(json.vulnerabilities || {}).map(([name, v]) => ({
        severity: v.severity,
        title: name,
        detail: v.via?.[0]?.title || v.name,
      }));
    } catch (err) {
      const e = err as { stdout?: string };
      if (e.stdout) {
        try {
          const json = JSON.parse(e.stdout) as {
            vulnerabilities?: Record<string, { severity: string; name: string }>;
          };
          return Object.entries(json.vulnerabilities || {}).map(([name, v]) => ({
            severity: v.severity,
            title: name,
            detail: v.name,
          }));
        } catch {
          // ignore
        }
      }
      this.logger.warn(`npm audit skipped: ${(err as Error).message}`);
      return [];
    }
  }

  private walkSourceFiles(dir: string, onFile: (path: string, content: string) => void): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.walkSourceFiles(full, onFile);
      } else if (/\.(ts|tsx|js|jsx|env|json|yaml|yml)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          onFile(full, content);
        } catch {
          // skip binary/unreadable
        }
      }
    }
  }
}

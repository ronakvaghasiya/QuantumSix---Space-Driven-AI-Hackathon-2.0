import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class PlatformService {
  constructor(private readonly config: ConfigService) {}

  getRuntimeConfig(clientPlatform?: string | null) {
    const serverOs = process.platform;
    const isWindows = serverOs === 'win32';
    const qdrantUrl =
      this.config.get<string>('QDRANT_URL') ||
      (isWindows ? 'http://127.0.0.1:6333' : 'http://localhost:6333');

    return {
      serverOs,
      clientPlatform: clientPlatform || null,
      isWindows,
      isLinux: serverOs === 'linux',
      isMac: serverOs === 'darwin',
      qdrantUrl,
      reposPath: (this.config.get<string>('REPOS_BASE_PATH') || path.join(os.tmpdir(), 'sdlc-repos')).replace(
        /\\/g,
        '/',
      ),
      setupCommand: 'npm run setup:local',
      devCommand: 'npm run dev:local',
      repairCommand: 'npm run repair:qdrant',
      note: isWindows
        ? 'Windows: use 127.0.0.1 for Qdrant (IPv6 localhost issue).'
        : 'Linux/macOS: localhost works for Qdrant.',
    };
  }
}

import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GitLabConnection } from './entities/gitlab-connection.entity';
import { VcsAuthType } from '../common/enums/project.enum';
import { SaveGitLabPatDto } from './dto/gitlab.dto';

export interface GitLabRepoSummary {
  id: number;
  name: string;
  fullName: string;
  namespace: string;
  defaultBranch: string;
  description: string | null;
  visibility: string;
  webUrl: string;
  cloneUrl: string;
}

export interface GitLabBranchSummary {
  name: string;
  protected: boolean;
  default: boolean;
}

interface GitLabUser {
  id: number;
  username: string;
  name: string;
}

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  namespace: { full_path: string };
  default_branch: string;
  description: string | null;
  visibility: string;
  web_url: string;
  http_url_to_repo: string;
}

interface GitLabBranch {
  name: string;
  protected: boolean;
  default: boolean;
}

@Injectable()
export class GitLabService implements OnModuleInit {
  private readonly logger = new Logger(GitLabService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(GitLabConnection)
    private readonly connectionRepo: Repository<GitLabConnection>,
  ) {}

  async onModuleInit(): Promise<void> {
    const envToken = this.config.get<string>('GITLAB_TOKEN');
    if (!envToken) return;

    const existing = await this.getActiveConnection();
    if (existing) return;

    try {
      await this.savePat({
        token: envToken,
        baseUrl: this.defaultBaseUrl(),
      });
      this.logger.log('GitLab connected from GITLAB_TOKEN env variable');
    } catch (err) {
      this.logger.warn(`GITLAB_TOKEN env invalid: ${(err as Error).message}`);
    }
  }

  private defaultBaseUrl(): string {
    return this.config.get('GITLAB_BASE_URL', 'https://gitlab.com').replace(/\/$/, '');
  }

  private apiUrl(baseUrl: string, path: string): string {
    return `${baseUrl}/api/v4${path}`;
  }

  private async gitlabFetch<T>(
    baseUrl: string,
    path: string,
    token: string,
    options?: RequestInit,
  ): Promise<T> {
    const res = await fetch(this.apiUrl(baseUrl, path), {
      ...options,
      headers: {
        'PRIVATE-TOKEN': token,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(`GitLab API error (${res.status}): ${body || res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  isOAuthConfigured(): boolean {
    return !!(
      this.config.get('GITLAB_CLIENT_ID') &&
      this.config.get('GITLAB_CLIENT_SECRET')
    );
  }

  getOAuthUrl(): string {
    if (!this.isOAuthConfigured()) {
      throw new BadRequestException(
        'GitLab OAuth is not configured. Use a Personal Access Token instead, or set GITLAB_CLIENT_ID and GITLAB_CLIENT_SECRET.',
      );
    }

    const clientId = this.config.getOrThrow<string>('GITLAB_CLIENT_ID');
    const redirectUri = this.config.getOrThrow<string>('GITLAB_CALLBACK_URL');
    const baseUrl = this.defaultBaseUrl();
    const scopes = 'api read_repository read_user';

    return `${baseUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
  }

  async handleOAuthCallback(code: string): Promise<GitLabConnection> {
    const clientId = this.config.getOrThrow<string>('GITLAB_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('GITLAB_CLIENT_SECRET');
    const redirectUri = this.config.getOrThrow<string>('GITLAB_CALLBACK_URL');
    const baseUrl = this.defaultBaseUrl();

    const tokenRes = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new BadRequestException('Failed to exchange GitLab OAuth code');
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (!tokenData.access_token) {
      throw new BadRequestException(tokenData.error || 'No access token received');
    }

    const user = await this.gitlabFetch<GitLabUser>(baseUrl, '/user', tokenData.access_token);

    await this.connectionRepo.update({ isActive: true }, { isActive: false });

    return this.connectionRepo.save(
      this.connectionRepo.create({
        authType: VcsAuthType.OAUTH,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        gitlabUsername: user.username,
        gitlabUserId: String(user.id),
        gitlabBaseUrl: baseUrl,
        tokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        isActive: true,
      }),
    );
  }

  async savePat(dto: SaveGitLabPatDto): Promise<GitLabConnection> {
    const baseUrl = (dto.baseUrl || this.defaultBaseUrl()).replace(/\/$/, '');

    let user: GitLabUser;
    try {
      user = await this.gitlabFetch<GitLabUser>(baseUrl, '/user', dto.token);
    } catch {
      throw new BadRequestException('Invalid GitLab token or base URL');
    }

    await this.connectionRepo.update({ isActive: true }, { isActive: false });

    return this.connectionRepo.save(
      this.connectionRepo.create({
        authType: VcsAuthType.PAT,
        accessToken: dto.token,
        gitlabUsername: user.username,
        gitlabUserId: String(user.id),
        gitlabBaseUrl: baseUrl,
        isActive: true,
      }),
    );
  }

  async getActiveConnection(): Promise<GitLabConnection | null> {
    return this.connectionRepo.findOne({ where: { isActive: true } });
  }

  async getConnectionStatus(): Promise<{
    connected: boolean;
    authType: string | null;
    username: string | null;
    baseUrl: string | null;
    oauthConfigured: boolean;
  }> {
    const conn = await this.getActiveConnection();
    return {
      connected: !!conn,
      authType: conn?.authType || null,
      username: conn?.gitlabUsername || null,
      baseUrl: conn?.gitlabBaseUrl || this.defaultBaseUrl(),
      oauthConfigured: this.isOAuthConfigured(),
    };
  }

  private async getToken(): Promise<{ token: string; baseUrl: string }> {
    const conn = await this.getActiveConnection();
    if (!conn) {
      throw new BadRequestException(
        'No GitLab connection configured. Add a Personal Access Token in Settings.',
      );
    }
    return { token: conn.accessToken, baseUrl: conn.gitlabBaseUrl };
  }

  async listRepositories(page = 1, perPage = 50): Promise<GitLabRepoSummary[]> {
    const { token, baseUrl } = await this.getToken();
    const [memberProjects, ownedProjects] = await Promise.all([
      this.gitlabFetch<GitLabProject[]>(
        baseUrl,
        `/projects?membership=true&order_by=last_activity_at&per_page=${perPage}&page=${page}`,
        token,
      ),
      this.gitlabFetch<GitLabProject[]>(
        baseUrl,
        `/projects?owned=true&order_by=last_activity_at&per_page=${perPage}&page=${page}`,
        token,
      ),
    ]);

    const byId = new Map<number, GitLabProject>();
    for (const p of [...memberProjects, ...ownedProjects]) {
      byId.set(p.id, p);
    }

    return Array.from(byId.values()).map((p) => ({
      id: p.id,
      name: p.name,
      fullName: p.path_with_namespace,
      namespace: p.namespace.full_path,
      defaultBranch: p.default_branch || 'main',
      description: p.description,
      visibility: p.visibility,
      webUrl: p.web_url,
      cloneUrl: p.http_url_to_repo,
    }));
  }

  async listBranches(projectId: number): Promise<GitLabBranchSummary[]> {
    const { token, baseUrl } = await this.getToken();
    const project = await this.gitlabFetch<GitLabProject>(baseUrl, `/projects/${projectId}`, token);
    const defaultName = project.default_branch || 'main';
    const byName = new Map<string, GitLabBranchSummary>();

    const addBranch = (b: GitLabBranch) => {
      byName.set(b.name, {
        name: b.name,
        protected: b.protected,
        default: b.name === defaultName || b.default,
      });
    };

    try {
      const defaultBranch = await this.gitlabFetch<GitLabBranch>(
        baseUrl,
        `/projects/${projectId}/repository/branches/${encodeURIComponent(defaultName)}`,
        token,
      );
      addBranch(defaultBranch);
    } catch {
      byName.set(defaultName, { name: defaultName, protected: false, default: true });
    }

    let page = 1;
    while (page <= 10) {
      const batch = await this.gitlabFetch<GitLabBranch[]>(
        baseUrl,
        `/projects/${projectId}/repository/branches?per_page=100&page=${page}`,
        token,
      );
      if (batch.length === 0) break;
      for (const b of batch) addBranch(b);
      if (batch.length < 100) break;
      page++;
    }

    return Array.from(byName.values()).sort((a, b) => {
      if (a.default) return -1;
      if (b.default) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async getRepository(projectId: number): Promise<GitLabRepoSummary> {
    const { token, baseUrl } = await this.getToken();
    const p = await this.gitlabFetch<GitLabProject>(baseUrl, `/projects/${projectId}`, token);
    return {
      id: p.id,
      name: p.name,
      fullName: p.path_with_namespace,
      namespace: p.namespace.full_path,
      defaultBranch: p.default_branch || 'main',
      description: p.description,
      visibility: p.visibility,
      webUrl: p.web_url,
      cloneUrl: p.http_url_to_repo,
    };
  }

  async buildAuthenticatedCloneUrl(repositoryUrl: string): Promise<string> {
    const conn = await this.getActiveConnection();
    if (!conn) return repositoryUrl;

    const withGit = repositoryUrl.endsWith('.git') ? repositoryUrl : `${repositoryUrl}.git`;
    const parsed = new URL(withGit);
    parsed.username = 'oauth2';
    parsed.password = conn.accessToken;
    return parsed.toString();
  }

  async disconnect(): Promise<void> {
    await this.connectionRepo.update({ isActive: true }, { isActive: false });
  }

  async createBranch(projectId: number, branch: string, ref: string): Promise<void> {
    const { token, baseUrl } = await this.getToken();
    try {
      await this.gitlabFetch(
        baseUrl,
        `/projects/${projectId}/repository/branches`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ branch, ref }),
        },
      );
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!msg.includes('already exists') && !msg.includes('Branch already exists')) {
        throw err;
      }
    }
  }

  async createMergeRequest(opts: {
    projectId: number;
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
    skipBranchCreate?: boolean;
  }): Promise<{ iid: number; webUrl: string; sha: string | null }> {
    const { token, baseUrl } = await this.getToken();
    if (!opts.skipBranchCreate) {
      await this.createBranch(opts.projectId, opts.sourceBranch, opts.targetBranch);
    }

    const mr = await this.gitlabFetch<{
      iid: number;
      web_url: string;
      sha: string;
    }>(
      baseUrl,
      `/projects/${opts.projectId}/merge_requests`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          source_branch: opts.sourceBranch,
          target_branch: opts.targetBranch,
          title: opts.title,
          description: opts.description,
          remove_source_branch: false,
        }),
      },
    );

    return { iid: mr.iid, webUrl: mr.web_url, sha: mr.sha || null };
  }

  async mergeMergeRequest(projectId: number, mrIid: number): Promise<{ state: string; mergeCommitSha: string | null }> {
    const { token, baseUrl } = await this.getToken();
    const result = await this.gitlabFetch<{
      state: string;
      merge_commit_sha: string | null;
    }>(baseUrl, `/projects/${projectId}/merge_requests/${mrIid}/merge`, token, {
      method: 'PUT',
      body: JSON.stringify({ should_remove_source_branch: false }),
    });
    return { state: result.state, mergeCommitSha: result.merge_commit_sha };
  }

  async closeMergeRequest(projectId: number, mrIid: number): Promise<void> {
    const { token, baseUrl } = await this.getToken();
    await this.gitlabFetch(baseUrl, `/projects/${projectId}/merge_requests/${mrIid}`, token, {
      method: 'PUT',
      body: JSON.stringify({ state_event: 'close' }),
    });
  }

  async approveMergeRequest(projectId: number, mrIid: number): Promise<void> {
    const { token, baseUrl } = await this.getToken();
    try {
      await this.gitlabFetch(
        baseUrl,
        `/projects/${projectId}/merge_requests/${mrIid}/approve`,
        token,
        { method: 'POST', body: JSON.stringify({}) },
      );
    } catch {
      // Free tier may not support approve API — fall back to note only
    }
  }

  async addMergeRequestNote(projectId: number, mrIid: number, body: string): Promise<void> {
    const { token, baseUrl } = await this.getToken();
    await this.gitlabFetch(baseUrl, `/projects/${projectId}/merge_requests/${mrIid}/notes`, token, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }
}

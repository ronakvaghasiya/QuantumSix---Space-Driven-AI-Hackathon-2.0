export type ClientPlatform = 'windows' | 'linux' | 'macos' | 'other';

const TOKEN_KEY = 'quantumsix_token';
const USER_KEY = 'quantumsix_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  lastClientPlatform: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export function detectClientPlatform(): ClientPlatform {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  if (ua.includes('win') || platform.includes('win')) return 'windows';
  if (ua.includes('mac') || platform.includes('mac')) return 'macos';
  if (ua.includes('linux') || platform.includes('linux')) return 'linux';
  return 'other';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveAuth(data: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export interface PlatformRuntime {
  serverOs: string;
  clientPlatform: string | null;
  isWindows: boolean;
  isLinux: boolean;
  isMac: boolean;
  qdrantUrl: string;
  reposPath: string;
  setupCommand: string;
  devCommand: string;
  repairCommand: string;
  note: string;
}

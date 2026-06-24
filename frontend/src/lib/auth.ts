const TOKEN_KEY = 'repopilot_token';
const USER_KEY = 'repopilot_user';

export interface AuthUserState {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUserState;
  permissions?: string[];
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUserState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUserState;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
}

export function hasPermission(permission: string, permissions?: string[]): boolean {
  if (!isAuthEnabled()) return true;
  return permissions?.includes(permission) ?? false;
}

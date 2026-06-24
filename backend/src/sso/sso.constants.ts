export enum SsoProviderType {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  OIDC = 'oidc',
}

export const SSO_PRESETS: Record<
  string,
  { issuer: string; scopes: string; name: string }
> = {
  google: {
    name: 'Google',
    issuer: 'https://accounts.google.com',
    scopes: 'openid email profile',
  },
  microsoft: {
    name: 'Microsoft',
    issuer: 'https://login.microsoftonline.com/common/v2.0',
    scopes: 'openid email profile',
  },
};

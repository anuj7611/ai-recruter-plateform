export interface LoginMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export const OAUTH_PROVIDERS = ["google", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export type UserRole =
  | "CANDIDATE"
  | "RECRUITER"
  | "ORGANIZATION_ADMIN"
  | "SUPER_ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  emailVerifiedAt: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  candidateProfile?: Record<string, unknown> | null;
  recruiterProfile?: Record<string, unknown> | null;
}

export interface DeviceSession {
  id: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  ipAddress: string | null;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

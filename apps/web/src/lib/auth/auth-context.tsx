"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiRequest } from "./api";
import type { AuthUser, LoginInput, RegisterInput, UserRole } from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface RegisterResult {
  user: AuthUser;
  verificationEmailSent: boolean;
  message?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  register: (
    input: RegisterInput,
    role: "CANDIDATE" | "RECRUITER",
  ) => Promise<RegisterResult>;
  login: (input: LoginInput, role: UserRole) => Promise<AuthUser>;
  restoreSession: () => Promise<AuthUser>;
  requestWithAuth: <T>(path: string, init?: RequestInit) => Promise<T>;
  resendVerification: () => Promise<string>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<string> | null>(null);

  const renewAccessToken = useCallback(async () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = apiRequest<{ accessToken: string }>(
        "/auth/refresh",
        { method: "POST" },
      )
        .then((response) => {
          accessTokenRef.current = response.data.accessToken;
          return response.data.accessToken;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }

    return refreshPromiseRef.current;
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const accessToken = await renewAccessToken();
      const response = await apiRequest<{ user: AuthUser }>(
        "/auth/me",
        {},
        accessToken,
      );
      setUser(response.data.user);
      setStatus("authenticated");
      return response.data.user;
    } catch (error) {
      accessTokenRef.current = null;
      setUser(null);
      setStatus("unauthenticated");
      throw error;
    }
  }, [renewAccessToken]);

  useEffect(() => {
    void restoreSession().catch(() => undefined);
  }, [restoreSession]);

  const requestWithAuth = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      try {
        const response = await apiRequest<T>(
          path,
          init,
          accessTokenRef.current,
        );
        return response.data;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;

        const accessToken = await renewAccessToken();
        const response = await apiRequest<T>(path, init, accessToken);
        return response.data;
      }
    },
    [renewAccessToken],
  );

  const register = useCallback(async (
    input: RegisterInput,
    role: "CANDIDATE" | "RECRUITER",
  ) => {
    const portal = role === "RECRUITER" ? "recruiter" : "candidate";
    const response = await apiRequest<{
      user: AuthUser;
      verificationEmailSent: boolean;
    }>(`/auth/${portal}/register`, {
      method: "POST",
      body: JSON.stringify(input),
    });

    return { ...response.data, message: response.message };
  }, []);

  const login = useCallback(async (input: LoginInput, role: UserRole) => {
    const portalByRole: Record<UserRole, string> = {
      CANDIDATE: "candidate",
      RECRUITER: "recruiter",
      ORGANIZATION_ADMIN: "organization-admin",
      SUPER_ADMIN: "super-admin",
    };
    const response = await apiRequest<{
      user: AuthUser;
      accessToken: string;
    }>(`/auth/${portalByRole[role]}/login`, {
      method: "POST",
      body: JSON.stringify(input),
    });

    accessTokenRef.current = response.data.accessToken;
    setUser(response.data.user);
    setStatus("authenticated");
    return response.data.user;
  }, []);

  const resendVerification = useCallback(async () => {
    await requestWithAuth<Record<string, never>>("/auth/resend-verification", {
      method: "POST",
    });
    return "Verification email sent.";
  }, [requestWithAuth]);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await requestWithAuth("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
    }
  }, [clearSession, requestWithAuth]);

  const logoutAll = useCallback(async () => {
    try {
      await requestWithAuth("/auth/logout-all", { method: "POST" });
    } finally {
      clearSession();
    }
  }, [clearSession, requestWithAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      register,
      login,
      restoreSession,
      requestWithAuth,
      resendVerification,
      logout,
      logoutAll,
    }),
    [
      user,
      status,
      register,
      login,
      restoreSession,
      requestWithAuth,
      resendVerification,
      logout,
      logoutAll,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};

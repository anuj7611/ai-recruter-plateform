import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { createAuthSession } from "./auth.service.js";
import type { LoginMetadata, OAuthProvider } from "./auth.types.js";

interface OAuthTokens {
  accessToken: string;
}

interface OAuthProfile {
  providerAccountId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

const getApiUrl = () => {
  const apiUrl = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? "8000"}`;
  return apiUrl.replace(/\/$/, "");
};

const getCredentials = (provider: OAuthProvider) => {
  const prefix = provider.toUpperCase();
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    throw new ApiError(
      503,
      `${provider} OAuth is not configured`,
      "OAUTH_NOT_CONFIGURED",
    );
  }

  return { clientId, clientSecret };
};

const getCallbackUrl = (provider: OAuthProvider) =>
  `${getApiUrl()}/api/v1/auth/oauth/${provider}/callback`;

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  let body: T & {
    error?: string;
    error_description?: string;
  };

  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new ApiError(
      502,
      "OAuth provider returned an invalid response",
      "OAUTH_PROVIDER_ERROR",
    );
  }

  if (!response.ok || body.error) {
    throw new ApiError(
      401,
      body.error_description ?? body.error ?? "OAuth provider request failed",
      "OAUTH_PROVIDER_ERROR",
    );
  }

  return body;
};

export const getOAuthAuthorizationUrl = (
  provider: OAuthProvider,
  state: string,
) => {
  const { clientId } = getCredentials(provider);
  const callbackUrl = getCallbackUrl(provider);

  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    }).toString();
    return url.toString();
  }

  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "read:user user:email",
    state,
  }).toString();
  return url.toString();
};

const getGoogleIdentity = async (code: string) => {
  const { clientId, clientSecret } = getCredentials("google");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: getCallbackUrl("google"),
    }),
  });
  const tokenData = await parseJsonResponse<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>(tokenResponse);

  if (!tokenData.access_token) {
    throw new ApiError(
      401,
      "Google did not return an access token",
      "OAUTH_PROVIDER_ERROR",
    );
  }
  const profileResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { authorization: `Bearer ${tokenData.access_token}` } },
  );
  const profile = await parseJsonResponse<{
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string;
  }>(profileResponse);

  if (!profile.sub || !profile.email) {
    throw new ApiError(
      400,
      "Google did not provide the required account information",
      "OAUTH_PROFILE_INCOMPLETE",
    );
  }

  return {
    tokens: {
      accessToken: tokenData.access_token,
    } satisfies OAuthTokens,
    profile: {
      providerAccountId: profile.sub,
      email: profile.email.toLowerCase(),
      name: profile.name ?? profile.email.split("@")[0] ?? "User",
      avatarUrl: profile.picture ?? null,
      emailVerified: profile.email_verified,
    } satisfies OAuthProfile,
  };
};

const getGitHubIdentity = async (code: string) => {
  const { clientId, clientSecret } = getCredentials("github");
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: getCallbackUrl("github"),
      }),
    },
  );
  const tokenData = await parseJsonResponse<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>(tokenResponse);

  if (!tokenData.access_token) {
    throw new ApiError(
      401,
      "GitHub did not return an access token",
      "OAUTH_PROVIDER_ERROR",
    );
  }
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${tokenData.access_token}`,
    "user-agent": "ai-interview-api",
    "x-github-api-version": "2022-11-28",
  };
  const profileResponse = await fetch("https://api.github.com/user", { headers });
  const githubUser = await parseJsonResponse<{
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  }>(profileResponse);
  const emailsResponse = await fetch("https://api.github.com/user/emails", {
    headers,
  });
  const emails = await parseJsonResponse<
    Array<{ email: string; primary: boolean; verified: boolean }>
  >(emailsResponse);
  const selectedEmail =
    emails.find((entry) => entry.primary && entry.verified) ??
    emails.find((entry) => entry.verified);

  if (!selectedEmail) {
    throw new ApiError(
      400,
      "Your GitHub account does not have a verified email address",
      "OAUTH_EMAIL_NOT_VERIFIED",
    );
  }

  return {
    tokens: {
      accessToken: tokenData.access_token,
    } satisfies OAuthTokens,
    profile: {
      providerAccountId: String(githubUser.id),
      email: selectedEmail.email.toLowerCase(),
      name: githubUser.name ?? githubUser.login,
      avatarUrl: githubUser.avatar_url,
      emailVerified: selectedEmail.verified,
    } satisfies OAuthProfile,
  };
};

export const completeOAuthLogin = async (
  provider: OAuthProvider,
  code: string,
  metadata: LoginMetadata,
) => {
  const identity =
    provider === "google"
      ? await getGoogleIdentity(code)
      : await getGitHubIdentity(code);

  if (!identity.profile.emailVerified) {
    throw new ApiError(
      400,
      "OAuth email address is not verified",
      "OAUTH_EMAIL_NOT_VERIFIED",
    );
  }

  const dbProvider = provider.toUpperCase() as "GOOGLE" | "GITHUB";
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: dbProvider,
        providerAccountId: identity.profile.providerAccountId,
      },
    },
    select: { id: true, userId: true },
  });
  let userId: string;

  if (existingAccount) {
    userId = existingAccount.userId;
  } else {
    const existingUser = await prisma.user.findUnique({
      where: { email: identity.profile.email },
      select: { id: true, role: true, status: true },
    });

    if (existingUser) {
      if (existingUser.role !== "CANDIDATE") {
        throw new ApiError(
          403,
          "Use the login portal assigned to your account role",
          "OAUTH_ROLE_NOT_ALLOWED",
        );
      }

      if (existingUser.status !== "ACTIVE") {
        throw new ApiError(
          403,
          "This account is currently unavailable",
          "ACCOUNT_UNAVAILABLE",
        );
      }

      userId = existingUser.id;
      await prisma.$transaction([
        prisma.account.create({
          data: {
            userId,
            provider: dbProvider,
            providerAccountId: identity.profile.providerAccountId,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            emailVerifiedAt: new Date(),
            avatarUrl: identity.profile.avatarUrl,
          },
        }),
      ]);
    } else {
      const user = await prisma.user.create({
        data: {
          name: identity.profile.name,
          email: identity.profile.email,
          avatarUrl: identity.profile.avatarUrl,
          emailVerifiedAt: new Date(),
          role: "CANDIDATE",
          candidateProfile: { create: {} },
          accounts: {
            create: {
              provider: dbProvider,
              providerAccountId: identity.profile.providerAccountId,
            },
          },
        },
        select: { id: true },
      });
      userId = user.id;
    }
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      candidateProfile: { select: { id: true } },
      recruiterProfile: { select: { id: true } },
    },
  });

  if (user.status !== "ACTIVE") {
    throw new ApiError(
      403,
      "This account is currently unavailable",
      "ACCOUNT_UNAVAILABLE",
    );
  }

  if (user.role !== "CANDIDATE") {
    throw new ApiError(
      403,
      "Use the login portal assigned to your account role",
      "OAUTH_ROLE_NOT_ALLOWED",
    );
  }

  const session = await createAuthSession(user.id, user.role, metadata);
  return { user, ...session };
};

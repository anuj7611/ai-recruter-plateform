interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, error: ApiErrorBody) {
    const fieldErrors =
      error.details && typeof error.details === "object" && "fieldErrors" in error.details
        ? (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors
        : undefined;
    const firstFieldError = fieldErrors
      ? Object.values(fieldErrors).flat().find(Boolean)
      : undefined;

    super(firstFieldError ?? error.message ?? "Something went wrong. Please try again.");
    this.name = "ApiError";
    this.status = status;
    this.code = error.code ?? "REQUEST_FAILED";
    this.details = error.details;
  }
}

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

export const getOAuthUrl = (provider: "google" | "github") =>
  `${API_URL}/auth/oauth/${provider}`;

export const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<ApiResponse<T>> => {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, {
      code: "API_UNREACHABLE",
      message: "Unable to reach the API. Make sure the backend is running.",
    });
  }

  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: T;
    error?: ApiErrorBody;
  };

  if (!response.ok) throw new ApiError(response.status, body.error ?? {});

  return {
    success: body.success ?? true,
    message: body.message,
    data: (body.data ?? {}) as T,
  };
};

export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";

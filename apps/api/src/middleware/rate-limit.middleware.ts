import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  code: string;
  message: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const entries = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = options.keyGenerator?.(req) ?? req.ip ?? "unknown";
    const current = entries.get(key);
    const entry =
      !current || current.resetAt <= now
        ? { count: 1, resetAt: now + options.windowMs }
        : { count: current.count + 1, resetAt: current.resetAt };

    entries.set(key, entry);

    if (entries.size > 10_000) {
      for (const [storedKey, storedEntry] of entries) {
        if (storedEntry.resetAt <= now) entries.delete(storedKey);
      }
    }

    res.setHeader("RateLimit-Limit", options.max);
    res.setHeader("RateLimit-Remaining", Math.max(0, options.max - entry.count));
    res.setHeader("RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return next(new ApiError(429, options.message, options.code));
    }

    next();
  };
};

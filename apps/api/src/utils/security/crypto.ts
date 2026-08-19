import { createHash, randomBytes } from "node:crypto";

export const generateSecureToken = (): string => {
  return randomBytes(32).toString("hex");
};

export const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};
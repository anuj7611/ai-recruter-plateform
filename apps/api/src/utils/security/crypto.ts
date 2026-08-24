import { createHash, randomBytes } from "node:crypto";

export const generateSecureToken = (): string => {
  return randomBytes(32).toString("hex");
};

export const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const hashBuffer = (buffer: Buffer): string => {
  return createHash("sha256").update(buffer).digest("hex");
};

export const hashText = (text: string): string => {
  return createHash("sha256").update(text, "utf8").digest("hex");
};

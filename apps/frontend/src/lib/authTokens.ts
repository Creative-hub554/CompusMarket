import crypto from "crypto";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** URL-safe random token sent to the user; only its hash is persisted. */
export function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
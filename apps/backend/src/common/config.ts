const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:4001",
];

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT secret: set AUTH_SECRET or JWT_SECRET env var");
  }
  return secret;
}

export function getCorsOrigins(): string[] {
  const origins = (process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!process.env.CORS_ORIGIN && process.env.NODE_ENV === "production") {
    console.warn(
      "[config] CORS_ORIGIN not set — using localhost dev defaults. " +
      "Set CORS_ORIGIN in production to avoid blocking cross-origin requests.",
    );
  }

  return origins;
}

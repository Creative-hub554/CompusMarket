import { afterEach, describe, expect, it, vi } from "vitest";
import { getCorsOrigins } from "./config";

describe("getCorsOrigins", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns localhost defaults when CORS_ORIGIN is unset", () => {
    vi.stubEnv("CORS_ORIGIN", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(getCorsOrigins()).toEqual([
      "http://localhost:3000",
      "http://localhost:3010",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:4001",
    ]);
  });

  it("merges configured production origins with localhost development origins", () => {
    vi.stubEnv("CORS_ORIGIN", "https://champey.com,https://admin.champey.com");
    vi.stubEnv("NODE_ENV", "development");
    expect(getCorsOrigins()).toEqual([
      "http://localhost:3000",
      "http://localhost:3010",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:4001",
      "https://champey.com",
      "https://admin.champey.com",
    ]);
  });

  it("does not add localhost origins in production", () => {
    vi.stubEnv("CORS_ORIGIN", "https://champey.com,https://admin.champey.com");
    vi.stubEnv("NODE_ENV", "production");
    expect(getCorsOrigins()).toEqual([
      "https://champey.com",
      "https://admin.champey.com",
    ]);
  });

  it("splits comma, space, and newline-separated values", () => {
    vi.stubEnv("CORS_ORIGIN", "https://a.com, https://b.com\nhttps://c.com");
    vi.stubEnv("NODE_ENV", "production");
    expect(getCorsOrigins()).toEqual(["https://a.com", "https://b.com", "https://c.com"]);
  });
});

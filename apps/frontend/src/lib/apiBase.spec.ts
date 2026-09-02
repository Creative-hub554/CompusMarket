import { describe, it, expect, afterEach } from "vitest";
import { getApiBase, getBackendOrigin } from "./apiBase";

describe("getBackendOrigin", () => {
  const original = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = original;
  });

  it("returns default when env is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(getBackendOrigin()).toBe("http://localhost:4000");
  });

  it("strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com///";
    expect(getBackendOrigin()).toBe("https://api.example.com");
  });

  it("returns the env value as-is when no trailing slash", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    expect(getBackendOrigin()).toBe("https://api.example.com");
  });
});

describe("getApiBase", () => {
  const original = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = original;
  });

  it("appends /api when origin has no path", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    expect(getApiBase()).toBe("http://localhost:4000/api");
  });

  it("does not double-append /api when already present", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000/api";
    expect(getApiBase()).toBe("http://localhost:4000/api");
  });

  it("handles trailing slash on origin", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000/";
    expect(getApiBase()).toBe("http://localhost:4000/api");
  });
});

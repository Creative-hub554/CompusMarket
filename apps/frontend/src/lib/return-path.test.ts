import { describe, expect, it } from "vitest";
import { routerReturnPath, safeReturnPath } from "./return-path";

describe("return paths", () => {
  it.each([
    ["/market?tab=recent", "/market?tab=recent"],
    ["/en/market?q=phone&type=all#results", "/en/market?q=phone&type=all#results"],
    ["", "/fallback"],
    [null, "/fallback"],
    ["https://evil.example/steal", "/fallback"],
    ["//evil.example/steal", "/fallback"],
  ])("accepts only same-origin local paths: %j", (value, expected) => {
    expect(safeReturnPath(value, "/fallback")).toBe(expected);
  });

  it.each([
    ["/en/market?tab=recent", "en", "/market?tab=recent"],
    ["/km/market", "en", "/fallback"],
  ])("normalizes paths for the locale router: %j", (value, locale, expected) => {
    expect(routerReturnPath(value, locale, "/fallback")).toBe(expected);
  });
});

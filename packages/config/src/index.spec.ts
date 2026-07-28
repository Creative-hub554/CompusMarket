import { describe, it, expect } from "vitest";
import pkg from "../package.json";

describe("Config package", () => {
  it("should have correct package name", () => {
    expect(pkg.name).toBe("@theo/config");
  });
});

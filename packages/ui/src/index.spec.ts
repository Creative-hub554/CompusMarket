import { describe, it, expect } from "vitest";
import pkg from "../package.json";

describe("UI package", () => {
  it("should be importable", () => {
    expect(pkg.name).toBe("@theo/ui");
  });
});

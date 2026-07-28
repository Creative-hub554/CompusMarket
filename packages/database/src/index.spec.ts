import { describe, it, expect } from "vitest";
import { Role, ProductCondition, ProductStatus, OrderStatus, QuestionType } from "./index";

describe("Database exports", () => {
  it("should export Role constants", () => {
    expect(Role).toBeDefined();
    expect(Role.ADMIN).toBe("ADMIN");
    expect(Role.CUSTOMER).toBe("CUSTOMER");
  });

  it("should export ProductCondition", () => {
    expect(ProductCondition.A).toBe("A");
    expect(ProductCondition.B).toBe("B");
    expect(ProductCondition.C).toBe("C");
  });

  it("should export ProductStatus", () => {
    expect(ProductStatus.ACTIVE).toBe("ACTIVE");
  });

  it("should export OrderStatus", () => {
    expect(OrderStatus.PENDING).toBe("PENDING");
  });

  it("should export QuestionType", () => {
    expect(QuestionType.MULTIPLE_CHOICE).toBe("MULTIPLE_CHOICE");
  });
});

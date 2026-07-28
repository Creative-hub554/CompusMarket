import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const Role = {
  CUSTOMER: "CUSTOMER",
  CONTENT_EDITOR: "CONTENT_EDITOR",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
  ADMIN: "ADMIN",
  SELLER: "SELLER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ProductCondition = {
  A: "A",
  B: "B",
  C: "C",
} as const;
export type ProductCondition = (typeof ProductCondition)[keyof typeof ProductCondition];

export const ProductStatus = {
  ACTIVE: "ACTIVE",
  SOLD: "SOLD",
  RESERVED: "RESERVED",
  DISCONTINUED: "DISCONTINUED",
  DISABLED: "DISABLED",
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const ArticleCategory = {
  CAREER_GUIDE: "CAREER_GUIDE",
  INTERVIEW_TIPS: "INTERVIEW_TIPS",
  RESUME_EXAMPLES: "RESUME_EXAMPLES",
  JOB_SEARCH: "JOB_SEARCH",
  COMPUTER_LITERACY: "COMPUTER_LITERACY",
  WORKPLACE_COMMUNICATION: "WORKPLACE_COMMUNICATION",
  PRODUCTIVITY: "PRODUCTIVITY",
} as const;
export type ArticleCategory = (typeof ArticleCategory)[keyof typeof ArticleCategory];

export const OrderStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderItemStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PACKING: "PACKING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderItemStatus = (typeof OrderItemStatus)[keyof typeof OrderItemStatus];

export const WarrantyStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CLAIMED: "CLAIMED",
  VOID: "VOID",
} as const;
export type WarrantyStatus = (typeof WarrantyStatus)[keyof typeof WarrantyStatus];

export const WarrantyClaimStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type WarrantyClaimStatus = (typeof WarrantyClaimStatus)[keyof typeof WarrantyClaimStatus];

export const SellerAccountType = {
  PERSONAL: "PERSONAL",
  BUSINESS: "BUSINESS",
} as const;
export type SellerAccountType = (typeof SellerAccountType)[keyof typeof SellerAccountType];

export const VerificationStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const DocumentType = {
  ID: "ID",
  BUSINESS_LICENSE: "BUSINESS_LICENSE",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

// ── Office & Study Enums ──

export const DiagramType = {
  FLOWCHART: "flowchart",
  SEQUENCE: "sequence",
  CLASS: "class",
  STATE: "state",
  ER: "er",
  GANTT: "gantt",
  PIE: "pie",
  MINDMAP: "mindmap",
  TIMELINE: "timeline",
} as const;
export type DiagramType = (typeof DiagramType)[keyof typeof DiagramType];

export const QuestionType = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  TRUE_FALSE: "TRUE_FALSE",
  SHORT_ANSWER: "SHORT_ANSWER",
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export * from "@prisma/client";

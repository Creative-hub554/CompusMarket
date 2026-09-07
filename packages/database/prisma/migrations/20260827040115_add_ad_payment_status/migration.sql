-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BannerAd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL,
    "totalPrice" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripePaymentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "clickUrl" TEXT,
    "altText" TEXT,
    "title" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BannerAd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BannerAd" ("altText", "clickUrl", "createdAt", "currency", "description", "durationMinutes", "id", "imageUrl", "slot", "startAt", "stripePaymentId", "title", "totalPrice", "updatedAt", "userId", "videoUrl") SELECT "altText", "clickUrl", "createdAt", "currency", "description", "durationMinutes", "id", "imageUrl", "slot", "startAt", "stripePaymentId", "title", "totalPrice", "updatedAt", "userId", "videoUrl" FROM "BannerAd";
DROP TABLE "BannerAd";
ALTER TABLE "new_BannerAd" RENAME TO "BannerAd";
CREATE INDEX "BannerAd_userId_idx" ON "BannerAd"("userId");
CREATE INDEX "BannerAd_slot_idx" ON "BannerAd"("slot");
CREATE INDEX "BannerAd_startAt_idx" ON "BannerAd"("startAt");
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "objective" TEXT,
    "campaignType" TEXT NOT NULL DEFAULT 'DAILY_BUDGET',
    "dailyBudget" DECIMAL NOT NULL,
    "lifetimeBudget" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "stripePaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campaign_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("campaignType", "createdAt", "currency", "dailyBudget", "endAt", "id", "lifetimeBudget", "objective", "postId", "startAt", "status", "stripePaymentId", "updatedAt", "userId") SELECT "campaignType", "createdAt", "currency", "dailyBudget", "endAt", "id", "lifetimeBudget", "objective", "postId", "startAt", "status", "stripePaymentId", "updatedAt", "userId" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX "Campaign_postId_idx" ON "Campaign"("postId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

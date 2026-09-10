-- CreateTable
CREATE TABLE "Campaign" (
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
    "stripePaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campaign_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BannerAd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL,
    "totalPrice" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripePaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BannerAd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoAd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "cpv" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoAd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoAdView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoAdId" TEXT NOT NULL,
    "viewerId" TEXT,
    "watchedSeconds" INTEGER NOT NULL,
    "billed" BOOLEAN NOT NULL DEFAULT false,
    "billedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoAdView_videoAdId_fkey" FOREIGN KEY ("videoAdId") REFERENCES "VideoAd" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoAdView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE INDEX "Campaign_postId_idx" ON "Campaign"("postId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "BannerAd_userId_idx" ON "BannerAd"("userId");

-- CreateIndex
CREATE INDEX "BannerAd_slot_idx" ON "BannerAd"("slot");

-- CreateIndex
CREATE INDEX "BannerAd_startAt_idx" ON "BannerAd"("startAt");

-- CreateIndex
CREATE INDEX "VideoAd_userId_idx" ON "VideoAd"("userId");

-- CreateIndex
CREATE INDEX "VideoAdView_videoAdId_idx" ON "VideoAdView"("videoAdId");

-- CreateIndex
CREATE INDEX "VideoAdView_viewerId_idx" ON "VideoAdView"("viewerId");

-- CreateIndex
CREATE INDEX "VideoAdView_billed_idx" ON "VideoAdView"("billed");

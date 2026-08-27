-- CreateTable
CREATE TABLE "BannerAdEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventKey" TEXT NOT NULL,
    "bannerAdId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BannerAdEvent_bannerAdId_fkey" FOREIGN KEY ("bannerAdId") REFERENCES "BannerAd" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BannerAdEvent_eventKey_key" ON "BannerAdEvent"("eventKey");

-- CreateIndex
CREATE INDEX "BannerAdEvent_bannerAdId_type_idx" ON "BannerAdEvent"("bannerAdId", "type");

-- CreateIndex
CREATE INDEX "BannerAdEvent_createdAt_idx" ON "BannerAdEvent"("createdAt");

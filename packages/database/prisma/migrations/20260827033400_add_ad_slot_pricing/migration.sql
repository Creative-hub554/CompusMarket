-- CreateTable
CREATE TABLE "AdSlotPricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slot" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "durationMinutes" INTEGER NOT NULL DEFAULT 1440,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AdSlotPricing_slot_key" ON "AdSlotPricing"("slot");

-- CreateIndex
CREATE INDEX "AdSlotPricing_slot_idx" ON "AdSlotPricing"("slot");

-- CreateIndex
CREATE INDEX "AdSlotPricing_isActive_idx" ON "AdSlotPricing"("isActive");

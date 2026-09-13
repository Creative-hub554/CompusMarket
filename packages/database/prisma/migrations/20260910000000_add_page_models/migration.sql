-- Champey Pages: Phase 1-5
-- Adds Page, PageMember, PageFollow models, page messaging, shop, insights, and boosts.

-- 1. Extend NotificationKind enum
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'PAGE_FOLLOW';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'PAGE_MESSAGE';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'PAGE_POST';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'BOOST';

-- 2. Extend Post model: pageId FK, impressions counter, indexes
ALTER TABLE "Post" ADD COLUMN "pageId" TEXT;
ALTER TABLE "Post" ADD COLUMN "impressions" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Post_pageId_idx" ON "Post"("pageId");

-- 3. Extend Thread model: pageId FK (unique, one thread per page)
ALTER TABLE "Thread" ADD COLUMN "pageId" TEXT;
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_pageId_key" UNIQUE ("pageId");

-- 4. Create PageRole enum
CREATE TYPE "PageRole" AS ENUM ('OWNER', 'EDITOR');

-- 5. Create Page table
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "coverImage" TEXT,
    "phone" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- 6. Create PageMember table
CREATE TABLE "PageMember" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PageRole" NOT NULL DEFAULT 'EDITOR',

    CONSTRAINT "PageMember_pkey" PRIMARY KEY ("id")
);

-- 7. Create PageFollow table
CREATE TABLE "PageFollow" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageFollow_pkey" PRIMARY KEY ("id")
);

-- 8. Unique constraints
ALTER TABLE "Page" ADD CONSTRAINT "Page_username_key" UNIQUE ("username");
ALTER TABLE "PageMember" ADD CONSTRAINT "PageMember_pageId_userId_key" UNIQUE ("pageId", "userId");
ALTER TABLE "PageFollow" ADD CONSTRAINT "PageFollow_pageId_userId_key" UNIQUE ("pageId", "userId");

-- 9. Foreign keys: Page
ALTER TABLE "Page" ADD CONSTRAINT "Page_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Foreign keys: PageMember
ALTER TABLE "PageMember" ADD CONSTRAINT "PageMember_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageMember" ADD CONSTRAINT "PageMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 11. Foreign keys: PageFollow
ALTER TABLE "PageFollow" ADD CONSTRAINT "PageFollow_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageFollow" ADD CONSTRAINT "PageFollow_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. Foreign keys: Post.pageId
ALTER TABLE "Post" ADD CONSTRAINT "Post_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 13. Foreign keys: Thread.pageId
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 14. Indexes for Page
CREATE INDEX "Page_createdAt_idx" ON "Page"("createdAt");
CREATE INDEX "Page_ownerId_idx" ON "Page"("ownerId");
CREATE INDEX "Page_category_idx" ON "Page"("category");

-- 15. Indexes for PageMember
CREATE INDEX "PageMember_userId_idx" ON "PageMember"("userId");

-- 16. Indexes for PageFollow
CREATE INDEX "PageFollow_userId_idx" ON "PageFollow"("userId");

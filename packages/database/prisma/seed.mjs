/**
 * Idempotent demo seed — safe to run repeatedly (upserts by unique keys).
 * Usage: pnpm --filter @theo/database exec prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "change-me";

const CATEGORIES = [
  { name: "Phones", slug: "phones" },
  { name: "Electronics", slug: "electronics" },
  { name: "Fashion", slug: "fashion" },
  { name: "Home", slug: "home" },
  { name: "Food", slug: "food" },
  { name: "Other", slug: "other" },
];

const PRODUCTS = [
  {
    title: "iPhone 12 — 128GB, like new",
    slug: "iphone-12-128",
    category: "phones",
    price: 420,
    condition: "A",
    stock: 2,
    description:
      "Battery health 92%. Unlocked, no scratches, includes original box and cable.",
  },
  {
    title: "Samsung 27\" monitor",
    slug: "samsung-27-monitor",
    category: "electronics",
    price: 95,
    condition: "B",
    stock: 5,
    description: "1080p IPS panel, HDMI + VGA. Small mark on the stand.",
  },
  {
    title: "Handwoven krama scarf",
    slug: "krama-scarf",
    category: "fashion",
    price: 12,
    condition: "A",
    stock: 20,
    description: "Traditional Khmer krama, cotton, red and white.",
  },
  {
    title: "Rice cooker 1.8L",
    slug: "rice-cooker-18",
    category: "home",
    price: 28,
    condition: "B",
    stock: 7,
    description: "Non-stick inner pot, works perfectly.",
  },
];

async function main() {
  console.log("Seeding demo data…");

  // Admin user
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "ADMIN" },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
      username: "admin",
      emailVerified: new Date(),
    },
  });

  // Categories
  const categories = {};
  for (const c of CATEGORIES) {
    categories[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  // Demo products (posted by admin)
  for (const p of PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: p.title },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.product.create({
      data: {
        name: p.title,
        description: p.description,
        price: p.price,
        condition: p.condition,
        stock: p.stock,
        status: "ACTIVE",
        categoryId: categories[p.category].id,
        sellerId: null,
      },
    });
  }

  // Demo public group + welcome post
  let group = await prisma.group.findFirst({
    where: { name: "Champey Community" },
  });
  if (!group) {
    group = await prisma.group.create({
      data: {
        name: "Champey Community",
        description: "The official hangout — announcements, intros and questions.",
        privacy: "PUBLIC",
        creatorId: admin.id,
        members: { create: { userId: admin.id, role: "ADMIN" } },
      },
    });
  }
  const groupPost = await prisma.post.findFirst({
    where: { groupId: group.id, content: { contains: "Welcome to Champey" } },
    select: { id: true },
  });
  if (!groupPost) {
    await prisma.post.create({
      data: {
        authorId: admin.id,
        groupId: group.id,
        pinnedAt: new Date(),
        content:
          "Welcome to Champey! 👋\n\nIntroduce yourself, join a group, and check the Market for deals. @admin is here if you need help.",
      },
    });
  }

  // Demo job
  const demoJob = await prisma.job.findFirst({
    where: { title: "Sales Associate (Part-time)", company: "Champey Demo Shop" },
    select: { id: true },
  });
  if (!demoJob) {
    await prisma.job.create({
      data: {
        title: "Sales Associate (Part-time)",
        company: "Champey Demo Shop",
        location: "Phnom Penh",
        type: "PART_TIME",
        description:
          "Greet customers, manage listings photos and help with deliveries. Khmer and basic English required. Flexible hours, weekly pay.",
        salaryMin: 180,
        salaryMax: 250,
        status: "OPEN",
        postedById: admin.id,
      },
    });
  }

  // Backfill email verification for legacy accounts. Email verification was
  // introduced as a hard login requirement after many accounts already
  // existed. Those legacy users were never issued a verification token, so
  // treat them as trusted/verified. New-gate users who genuinely haven't
  // verified still hold an active, unused token and are intentionally left
  // unverified. Idempotent: each run only flips users in the described state.
  const legacyUsers = await prisma.user.findMany({
    where: {
      emailVerified: null,
      emailVerificationTokens: {
        none: { usedAt: null, expiresAt: { gt: new Date() } },
      },
    },
    select: { id: true },
  });
  if (legacyUsers.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: legacyUsers.map((u) => u.id) } },
      data: { emailVerified: new Date() },
    });
    console.log(`  verified legacy accounts: ${legacyUsers.length}`);
  }

  console.log("Seed complete.");
  console.log(`  admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  categories: ${CATEGORIES.length}`);
  console.log(`  products:   ${PRODUCTS.length}`);
  console.log("  group:      Champey Community (+ pinned welcome post)");
  console.log("  job:        Sales Associate (Part-time)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

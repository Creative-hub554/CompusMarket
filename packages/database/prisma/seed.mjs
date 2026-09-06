/**
 * Idempotent demo seed — safe to run repeatedly (upserts by unique keys).
 * Usage: pnpm --filter @theo/database exec prisma db seed
 *
 * After seeding, reindex Meilisearch so the market search reflects new data:
 *   POST /api/search/reindex (ADMIN token)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "change-me";

// Demo account password for every seeded seller/buyer (change-me is fine for
// local dev; these are all non-admin).
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "change-me";

const CATEGORIES = [
  { name: "Phones", slug: "phones" },
  { name: "Electronics", slug: "electronics" },
  { name: "Fashion", slug: "fashion" },
  { name: "Home", slug: "home" },
  { name: "Food", slug: "food" },
  { name: "Other", slug: "other" },
];

/** picsum.photos gives stable, per-seed images; frontend renders them when
 *  IMAGE_HOSTS includes the host (see .freebuff/run.md). */
const img = (seed) => `https://picsum.photos/seed/${seed}/600/600`;

// Reliable public sample videos (Google's GTV test bucket) for promo products.
const PROMO_VIDEOS = {
  escapes: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  joyrides: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
};

// Demo sellers — each gets an APPROVED SellerProfile so the seller write path
// and the "sold by verified seller" badges work.
const SELLERS = [
  {
    email: "sokha@sokhatech.store",
    name: "Sokha Tech",
    username: "sokhatech",
    accountType: "BUSINESS",
    phone: "+855 12 345 678",
    address: "Toul Kork, Phnom Penh",
  },
  {
    email: "reaksmey@rkm-market.com",
    name: "Reaksmey Market",
    username: "rkmmarket",
    accountType: "PERSONAL",
    phone: "+855 16 789 012",
    address: "Siem Reap",
  },
  {
    email: "dara@daraphones.store",
    name: "Dara Phones",
    username: "daraphones",
    accountType: "BUSINESS",
    phone: "+855 93 246 810",
    address: "Boeung Keng Kang, Phnom Penh",
  },
];

// Demo buyers — they own the seeded orders.
const BUYERS = [
  { email: "vuthy@example.com", name: "Vuthy Chan", username: "vuthy" },
  { email: "sreypich@example.com", name: "Sreypich Nhim", username: "sreypich" },
];

const PRODUCTS = [
  // Phones
  {
    title: "iPhone 12 — 128GB, like new",
    slug: "iphone-12-128",
    category: "phones",
    price: 420,
    condition: "A",
    stock: 2,
    description:
      "Battery health 92%. Unlocked, no scratches, includes original box and cable.",
    seller: "daraphones",
    images: [img("iphone-12-128-1"), img("iphone-12-128-2")],
    serialNumber: "F2LQK0XHLLXC",
    warrantyMonths: 12,
  },
  {
    title: "Samsung Galaxy A54 5G 128GB",
    slug: "samsung-galaxy-a54",
    category: "phones",
    price: 260,
    condition: "A",
    stock: 4,
    description:
      "Mid-range 5G phone in excellent shape. Battery health 96%, no visible wear.",
    seller: "daraphones",
    images: [img("galaxy-a54-1")],
    serialNumber: "R5CW11ABCDE",
    warrantyMonths: 6,
  },
  {
    title: "Xiaomi Redmi Note 12 4/128GB",
    slug: "xiaomi-redmi-note-12",
    category: "phones",
    price: 145,
    condition: "B",
    stock: 6,
    description:
      "Reliable daily driver. Minor scuffs on the frame, screen is flawless.",
    seller: "sokhatech",
    images: [img("redmi-note-12-1"), img("redmi-note-12-2")],
    serialNumber: "RN12K9Z0X",
  },
  // Electronics
  {
    title: "Samsung 27\" monitor",
    slug: "samsung-27-monitor",
    category: "electronics",
    price: 95,
    condition: "B",
    stock: 5,
    description: "1080p IPS panel, HDMI + VGA. Small mark on the stand.",
    seller: "sokhatech",
    images: [img("samsung-27-1"), img("samsung-27-2")],
    warrantyMonths: 3,
  },
  {
    title: "Lenovo ThinkPad T480 — i5, 16GB, 512GB SSD",
    slug: "thinkpad-t480",
    category: "electronics",
    price: 320,
    condition: "B",
    stock: 3,
    description:
      "Business laptop with great keyboard. New battery fitted, runs Windows 11.",
    seller: "sokhatech",
    images: [img("thinkpad-t480-1"), img("thinkpad-t480-2"), img("thinkpad-t480-3")],
    serialNumber: "PF3M0GZ8",
    warrantyMonths: 6,
  },
  {
    title: "JBL Flip 5 Bluetooth speaker",
    slug: "jbl-flip-5",
    category: "electronics",
    price: 55,
    condition: "A",
    stock: 8,
    description: "Waterproof, big sound for its size. Barely used, full box.",
    seller: "reaksmey",
    images: [img("jbl-flip-5-1")],
    video: "escapes",
  },
  {
    title: "Anker 20,000mAh power bank",
    slug: "anker-20000-powerbank",
    category: "electronics",
    price: 30,
    condition: "A",
    stock: 12,
    description: "Dual USB-A + USB-C, fast charging. Includes pouch and cable.",
    seller: "sokhatech",
    images: [img("anker-powerbank-1"), img("anker-powerbank-2")],
  },
  {
    title: "Logitech MX Master 3S mouse",
    slug: "logitech-mx-master-3s",
    category: "electronics",
    price: 78,
    condition: "A",
    stock: 4,
    description: "Silent clicks, 8K DPI sensor, USB-C rechargeable. Like new.",
    seller: "sokhatech",
    images: [img("mx-master-3s-1")],
  },
  // Fashion
  {
    title: "Handwoven krama scarf",
    slug: "krama-scarf",
    category: "fashion",
    price: 12,
    condition: "A",
    stock: 20,
    description: "Traditional Khmer krama, cotton, red and white.",
    seller: "reaksmey",
    images: [img("krama-scarf-1"), img("krama-scarf-2")],
  },
  {
    title: "Khmer silk scarf — hand-dyed",
    slug: "khmer-silk-scarf",
    category: "fashion",
    price: 45,
    condition: "A",
    stock: 6,
    description:
      "100% real silk from Siem Reap weavers. Hand-dyed ikat pattern, gift-ready.",
    seller: "reaksmey",
    images: [img("silk-scarf-1"), img("silk-scarf-2")],
  },
  {
    title: "Men's linen shirt — natural beige",
    slug: "linen-shirt-beige",
    category: "fashion",
    price: 22,
    condition: "B",
    stock: 10,
    description: "Breathable 100% linen, size L. Worn twice, no flaws.",
    seller: "reaksmey",
    images: [img("linen-shirt-1")],
  },
  {
    title: "Canvas sneakers — size 42",
    slug: "canvas-sneakers-42",
    category: "fashion",
    price: 18,
    condition: "B",
    stock: 7,
    description: "Classic white canvas sneakers, clean soles, slight toe crease.",
    seller: "reaksmey",
    images: [img("canvas-sneakers-1")],
  },
  // Home
  {
    title: "Rice cooker 1.8L",
    slug: "rice-cooker-18",
    category: "home",
    price: 28,
    condition: "B",
    stock: 7,
    description: "Non-stick inner pot, works perfectly.",
    seller: "reaksmey",
    images: [img("rice-cooker-1"), img("rice-cooker-2")],
  },
  {
    title: "Bamboo nightstand — two drawers",
    slug: "bamboo-nightstand",
    category: "home",
    price: 65,
    condition: "A",
    stock: 3,
    description: "Solid bamboo, assembled once and stored. Fits most bed frames.",
    seller: "reaksmey",
    images: [img("nightstand-1")],
  },
  {
    title: "Ceramic vase set — 3 pieces",
    slug: "ceramic-vase-set",
    category: "home",
    price: 35,
    condition: "A",
    stock: 5,
    description: "Handmade glazed ceramics in earth tones. Perfect for dried flowers.",
    seller: "reaksmey",
    images: [img("vase-set-1"), img("vase-set-2")],
  },
  {
    title: "Air fryer 5L — digital touch",
    slug: "air-fryer-5l",
    category: "home",
    price: 75,
    condition: "B",
    stock: 4,
    description: "1800W, 8 presets, dishwasher-safe basket. Lightly used.",
    seller: "sokhatech",
    images: [img("air-fryer-1")],
    warrantyMonths: 3,
    video: "joyrides",
  },
  // Food
  {
    title: "Kampot peppercorns 500g",
    slug: "kampot-peppercorns",
    category: "food",
    price: 16,
    condition: "A",
    stock: 25,
    description: "Red Kampot peppercorns, 2025 harvest, sealed pouch.",
    seller: "reaksmey",
    images: [img("kampot-pepper-1")],
  },
  {
    title: "Robusta coffee beans 1kg",
    slug: "robusta-coffee-1kg",
    category: "food",
    price: 14,
    condition: "A",
    stock: 30,
    description: "Ratanakiri-grown Robusta, medium roast, whole beans.",
    seller: "reaksmey",
    images: [img("coffee-1"), img("coffee-2")],
  },
  {
    title: "Artisan honey 1L",
    slug: "artisan-honey-1l",
    category: "food",
    price: 11,
    condition: "A",
    stock: 18,
    description: "Raw forest honey from Mondulkiri. Not filtered, not heated.",
    seller: "reaksmey",
    images: [img("honey-1")],
  },
  {
    title: "Palm sugar jar 500g",
    slug: "palm-sugar-jar",
    category: "food",
    price: 6,
    condition: "A",
    stock: 40,
    description: "Traditional Khmer palm sugar, low GI. Sealed glass jar.",
    seller: "reaksmey",
    images: [img("palm-sugar-1")],
  },
  // Other
  {
    title: "Yoga mat — 6mm non-slip",
    slug: "yoga-mat-6mm",
    category: "other",
    price: 24,
    condition: "A",
    stock: 9,
    description: "TPE mat with carry strap, alignment lines. Hardly used.",
    seller: "sokhatech",
    images: [img("yoga-mat-1")],
  },
  {
    title: "Urban backpack 30L",
    slug: "urban-backpack-30l",
    category: "other",
    price: 38,
    condition: "B",
    stock: 6,
    description: "Laptop sleeve, water-bottle pockets, rain cover. Zips all smooth.",
    seller: "reaksmey",
    images: [img("backpack-30l-1"), img("backpack-30l-2")],
  },
];

// Ordered demo orders. `items` reference products by slug; statuses/timestamps
// are set for realism. Reviews and warranties attach to the delivered order.
const ORDERS = [
  {
    buyer: "vuthy@example.com",
    status: "DELIVERED",
    createdAtDaysAgo: 18,
    items: [
      { slug: "iphone-12-128", qty: 1, status: "DELIVERED", daysAgo: 4 },
      { slug: "jbl-flip-5", qty: 1, status: "DELIVERED", daysAgo: 4 },
    ],
    review: {
      productSlug: "iphone-12-128",
      rating: 5,
      comment: "Phone arrived in the exact condition described. Battery is great, box included. Would buy from this seller again!",
    },
    warranty: { productSlug: "iphone-12-128", months: 12 },
  },
  {
    buyer: "vuthy@example.com",
    status: "SHIPPED",
    createdAtDaysAgo: 9,
    items: [
      { slug: "thinkpad-t480", qty: 1, status: "SHIPPED", daysAgo: 1 },
      { slug: "logitech-mx-master-3s", qty: 1, status: "SHIPPED", daysAgo: 1 },
    ],
  },
  {
    buyer: "sreypich@example.com",
    status: "PROCESSING",
    createdAtDaysAgo: 3,
    items: [
      { slug: "khmer-silk-scarf", qty: 2, status: "PACKING", daysAgo: 1 },
      { slug: "kampot-peppercorns", qty: 1, status: "APPROVED", daysAgo: 1 },
    ],
  },
  {
    buyer: "sreypich@example.com",
    status: "CANCELLED",
    createdAtDaysAgo: 12,
    items: [{ slug: "urban-backpack-30l", qty: 1, status: "CANCELLED", daysAgo: 8 }],
  },
];

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding demo data…");

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Admin user
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

  // Demo sellers (users + APPROVED SellerProfile)
  const sellers = {};
  for (const s of SELLERS) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { role: "SELLER", name: s.name, username: s.username },
      create: {
        email: s.email,
        passwordHash: demoHash,
        name: s.name,
        role: "SELLER",
        username: s.username,
        emailVerified: new Date(),
      },
    });
    const profile = await prisma.sellerProfile.upsert({
      where: { userId: user.id },
      update: {
        accountType: s.accountType,
        phone: s.phone,
        address: s.address,
        verificationStatus: "APPROVED",
        reviewedBy: admin.id,
        verifiedAt: daysAgo(60),
      },
      create: {
        userId: user.id,
        accountType: s.accountType,
        phone: s.phone,
        address: s.address,
        verificationStatus: "APPROVED",
        reviewedBy: admin.id,
        verifiedAt: daysAgo(60),
      },
    });
    sellers[s.username] = profile;
  }

  // Demo buyers
  const buyers = {};
  for (const b of BUYERS) {
    buyers[b.email] = await prisma.user.upsert({
      where: { email: b.email },
      update: { name: b.name, username: b.username },
      create: {
        email: b.email,
        passwordHash: demoHash,
        name: b.name,
        role: "CUSTOMER",
        username: b.username,
        emailVerified: new Date(),
      },
    });
  }

  // Categories
  const categories = {};
  for (const c of CATEGORIES) {
    categories[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  // Products — attach seller profiles, images, promos, serials, warranties.
  const productsBySlug = {};
  for (const p of PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: p.title },
      select: { id: true },
    });
    if (existing) {
      // Re-run: upgrade catalog fields (images, seller, promos) on rows
      // created by an older seed, keeping ids stable.
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          sellerId: sellers[p.seller]?.id ?? null,
          images: p.images ?? null,
          serialNumber: p.serialNumber ?? null,
          warrantyMonths: p.warrantyMonths ?? null,
          videoUrl: p.video ? PROMO_VIDEOS[p.video] : null,
          videoActive: Boolean(p.video),
        },
      });
      productsBySlug[p.slug] = existing.id;
      continue;
    }
    const created = await prisma.product.create({
      data: {
        name: p.title,
        description: p.description,
        price: p.price,
        condition: p.condition,
        stock: p.stock,
        status: "ACTIVE",
        categoryId: categories[p.category].id,
        sellerId: sellers[p.seller]?.id ?? null,
        images: p.images ?? null,
        serialNumber: p.serialNumber ?? null,
        warrantyMonths: p.warrantyMonths ?? null,
        videoUrl: p.video ? PROMO_VIDEOS[p.video] : null,
        videoActive: Boolean(p.video),
        createdAt: daysAgo(21),
      },
    });
    productsBySlug[p.slug] = created.id;
  }

  // Orders + items (idempotent: skip if the buyer already has an order
  // containing the first item of this order).
  let orderCount = 0;
  for (const o of ORDERS) {
    const first = o.items[0];
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId: buyers[o.buyer].id,
        items: { some: { product: { name: PRODUCTS.find((p) => p.slug === first.slug).title } } },
      },
      select: { id: true },
    });
    if (existingOrder) continue;

    // Resolve prices first so Order.total can be computed from the items.
    const itemPrices = {};
    for (const item of o.items) {
      const product = await prisma.product.findUnique({
        where: { id: productsBySlug[item.slug] },
        select: { price: true },
      });
      itemPrices[item.slug] = product.price;
    }
    const total = o.items.reduce((sum, item) => sum + Number(itemPrices[item.slug]) * item.qty, 0);

    const order = await prisma.order.create({
      data: {
        userId: buyers[o.buyer].id,
        status: o.status,
        total,
        createdAt: daysAgo(o.createdAtDaysAgo),
      },
    });

    for (const item of o.items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: productsBySlug[item.slug],
          quantity: item.qty,
          price: itemPrices[item.slug],
          status: item.status,
          packedAt: item.daysAgo < 3 ? daysAgo(item.daysAgo) : null,
          shippedAt: item.status === "SHIPPED" || item.status === "DELIVERED" ? daysAgo(item.daysAgo) : null,
          deliveredAt: item.status === "DELIVERED" ? daysAgo(item.daysAgo) : null,
          createdAt: daysAgo(item.daysAgo + 2),
        },
      });
    }

    // Review for the delivered order
    if (o.review) {
      const item = await prisma.orderItem.findFirst({
        where: {
          orderId: order.id,
          productId: productsBySlug[o.review.productSlug],
        },
        select: { id: true },
      });
      if (item) {
        await prisma.review.create({
          data: {
            rating: o.review.rating,
            comment: o.review.comment,
            userId: buyers[o.buyer].id,
            productId: productsBySlug[o.review.productSlug],
            orderItemId: item.id,
          },
        });
      }
    }

    // Warranty for the delivered product
    if (o.warranty) {
      const item = await prisma.orderItem.findFirst({
        where: {
          orderId: order.id,
          productId: productsBySlug[o.warranty.productSlug],
        },
        select: { id: true },
      });
      if (item) {
        await prisma.warranty.create({
          data: {
            orderItemId: item.id,
            productId: productsBySlug[o.warranty.productSlug],
            userId: buyers[o.buyer].id,
            months: o.warranty.months,
            startDate: daysAgo(4),
            endDate: daysAgo(-365),
            status: "ACTIVE",
          },
        });
      }
    }

    orderCount++;
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

  const productCount = await prisma.product.count();
  console.log("Seed complete.");
  console.log(`  admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  demo users: ${SELLERS.length} sellers, ${BUYERS.length} buyers (password: ${DEMO_PASSWORD})`);
  console.log(`  categories: ${CATEGORIES.length}`);
  console.log(`  products:   ${productCount} (${PRODUCTS.length} defined, ${PRODUCTS.filter((p) => p.video).length} promo videos)`);
  console.log(`  orders:     ${orderCount} created this run`);
  console.log("  group:      Champey Community (+ pinned welcome post)");
  console.log("  job:        Sales Associate (Part-time)");
  console.log("  ▶ reindex Meilisearch: POST /api/search/reindex (see .freebuff/run.md)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
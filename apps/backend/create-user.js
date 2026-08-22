const bcrypt = require("bcryptjs");
const { prisma } = require("@theo/database");

async function main() {
  try {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
    }
    const hash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash: hash, name: "Admin User", role: "ADMIN" },
      });
      console.log("UPDATED: " + email);
    } else {
      await prisma.user.create({
        data: { email, passwordHash: hash, name: "Admin User", role: "ADMIN" },
      });
      console.log("CREATED: " + email);
    }
  } catch (e) {
    console.log("ERROR: " + e.message);
  }
  await prisma.$disconnect();
}
main();

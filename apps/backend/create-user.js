const bcrypt = require("bcryptjs");
const { prisma } = require("@theo/database");

async function main() {
  try {
    const email = "admin@khonline";
    const password = "***REDACTED***";
    const hash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash: hash, name: "Admin User", role: "ADMIN" },
      });
      console.log("UPDATED: " + email + " / " + password);
    } else {
      await prisma.user.create({
        data: { email, passwordHash: hash, name: "Admin User", role: "ADMIN" },
      });
      console.log("CREATED: " + email + " / " + password);
    }
  } catch (e) {
    console.log("ERROR: " + e.message);
  }
  await prisma.$disconnect();
}
main();

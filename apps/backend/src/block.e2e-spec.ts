/// <reference types="vitest/globals" />

import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@theo/database";

const runContract = process.env.RUN_DB_CONTRACT === "1" && Boolean(process.env.DATABASE_URL);
const describeDatabase = runContract ? describe : describe.skip;

describeDatabase("Block database contract", () => {
  const prisma = new PrismaClient();
  const userIds = [randomUUID(), randomUUID()];

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("supports both directions, rejects duplicate pairs, exposes indexes, and cleans up", async () => {
    const [blocker, blocked] = await Promise.all([
      prisma.user.create({ data: { id: userIds[0], email: `${userIds[0]}@contract.test` } }),
      prisma.user.create({ data: { id: userIds[1], email: `${userIds[1]}@contract.test` } }),
    ]);

    await prisma.block.create({ data: { blockerId: blocker.id, blockedId: blocked.id } });
    await prisma.block.create({ data: { blockerId: blocked.id, blockedId: blocker.id } });

    await expect(
      prisma.block.create({ data: { blockerId: blocker.id, blockedId: blocked.id } })
    ).rejects.toMatchObject({ code: "P2002" } satisfies Partial<Prisma.PrismaClientKnownRequestError>);

    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'Block'
    `;
    expect(indexes.map((index) => index.indexname)).toEqual(
      expect.arrayContaining(["Block_blockerId_blockedId_key", "Block_blockedId_idx"])
    );

    await prisma.user.delete({ where: { id: blocker.id } });
    expect(
      await prisma.block.count({
        where: { OR: [{ blockerId: blocker.id }, { blockedId: blocker.id }] },
      })
    ).toBe(0);
  });
});

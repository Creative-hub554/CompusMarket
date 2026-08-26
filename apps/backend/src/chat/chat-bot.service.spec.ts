import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatBotService, parseCommand, BOT_USERNAME } from "./chat-bot.service";
import { PrismaService } from "../prisma/prisma.service";

vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "hashed") } }));

function makeAi(agentReply: string | null = null) {
  return {
    status: vi.fn(() => ({ available: agentReply !== "unavailable", model: "test" })),
    runAgentTurn: vi.fn(async () => agentReply),
    findProducts: vi.fn(async () => []),
  };
}

function makePrisma() {
  return {
    user: {
      upsert: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    order: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    threadParticipant: {
      findMany: vi.fn(),
    },
    message: {
      findMany: vi.fn(async () => []),
    },
  };
}

describe("parseCommand", () => {
  it("parses slash commands case-insensitively", () => {
    expect(parseCommand("/start")).toEqual({ type: "start" });
    expect(parseCommand("/HELP")).toEqual({ type: "help" });
    expect(parseCommand("/Find   iPhone 12 ")).toEqual({ type: "find", arg: "iPhone 12" });
    expect(parseCommand("/products")).toEqual({ type: "find", arg: "" });
    expect(parseCommand("/orders")).toEqual({ type: "orders" });
    expect(parseCommand("/dice")).toEqual({ type: "dice" });
    expect(parseCommand("/time")).toEqual({ type: "time" });
    expect(parseCommand("/joke")).toEqual({ type: "joke" });
    expect(parseCommand("/nope")).toEqual({ type: "fallback" });
  });

  it("detects greetings and plain text", () => {
    expect(parseCommand("Hello there!")).toEqual({ type: "greet" });
    expect(parseCommand("សួស្តី bot")).toEqual({ type: "greet" });
    expect(parseCommand("what is the weather?")).toEqual({ type: "fallback" });
  });
});

describe("ChatBotService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let ai: ReturnType<typeof makeAi>;
  let service: ChatBotService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    ai = makeAi();
    service = new ChatBotService(
      prisma as unknown as PrismaService,
      ai as unknown as never
    );
  });

  it("upserts the bot account once and caches the id", async () => {
    prisma.user.upsert.mockResolvedValue({ id: "bot-1" });

    await expect(service.getBotUserId()).resolves.toBe("bot-1");
    await expect(service.getBotUserId()).resolves.toBe("bot-1");

    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: BOT_USERNAME },
        update: {},
      })
    );
  });

  it("responds only in 1:1 threads that contain the bot", async () => {
    prisma.user.upsert.mockResolvedValue({ id: "bot-1" });

    prisma.threadParticipant.findMany.mockResolvedValue([{ userId: "me" }, { userId: "bot-1" }]);
    await expect(service.shouldRespond("t1")).resolves.toBe(true);

    prisma.threadParticipant.findMany.mockResolvedValue([
      { userId: "me" },
      { userId: "friend" },
      { userId: "bot-1" },
    ]);
    await expect(service.shouldRespond("t2")).resolves.toBe(false);

    prisma.threadParticipant.findMany.mockResolvedValue([{ userId: "me" }, { userId: "friend" }]);
    await expect(service.shouldRespond("t3")).resolves.toBe(false);
  });

  it("searches active products for /find", async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: "p1", name: "iPhone 12", price: 420, stock: 2 },
    ]);

    const replies = await service.buildReplies("t", "me", "/find iphone");

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
        take: 3,
      })
    );
    expect(replies[0]).toContain("iPhone 12");
    expect(replies[0]).toContain("$420.00");
  });

  it("handles empty search and no results gracefully", async () => {
    const ask = await service.buildReplies("t", "me", "/find ");
    expect(ask[0]).toMatch(/which product/i);

    prisma.product.findMany.mockResolvedValue([]);
    const none = await service.buildReplies("t", "me", "/find unicorn");
    expect(none[0]).toMatch(/no active products matched/i);
  });

  it("summarises orders by status", async () => {
    prisma.order.count.mockResolvedValue(3);
    prisma.order.groupBy.mockResolvedValue([
      { status: "PENDING", _count: { _all: 2 } },
      { status: "DELIVERED", _count: { _all: 1 } },
    ]);

    const replies = await service.buildReplies("t", "me", "/orders");

    expect(replies[0]).toContain("3 orders");
    expect(replies[0]).toContain("PENDING: 2");
    expect(replies[0]).toContain("DELIVERED: 1");
  });

  it("falls back to a hint for unknown input", async () => {
    prisma.product.findMany.mockResolvedValue([]);
    const replies = await service.buildReplies("t", "me", "asdfgh");
    expect(replies[0]).toMatch(/\/help/i);
  });

  it("routes natural language through the AI agent when available", async () => {
    ai = makeAi("I found a great krama scarf for you at /shop!");
    service = new ChatBotService(prisma as unknown as PrismaService, ai as unknown as never);
    vi.clearAllMocks();
    prisma.message.findMany.mockResolvedValue([]);
    prisma.user.upsert.mockResolvedValue({ id: "bot-1" });

    const replies = await service.buildReplies("t", "me", "any gift ideas for mom?");

    expect(ai.runAgentTurn).toHaveBeenCalledTimes(1);
    const [history, tools] = (ai.runAgentTurn as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(history[0].role).toBe("system");
    expect(tools.map((t: { function: { name: string } }) => t.function.name)).toEqual([
      "search_products",
      "count_my_orders",
    ]);
    expect(replies).toEqual(["I found a great krama scarf for you at /shop!"]);
  });

  it("keeps slash commands deterministic even when AI is available", async () => {
    ai = makeAi("should not be used");
    service = new ChatBotService(prisma as unknown as PrismaService, ai as unknown as never);
    vi.clearAllMocks();
    prisma.order.count.mockResolvedValue(0);

    const replies = await service.buildReplies("t", "me", "/orders");

    expect(ai.runAgentTurn).not.toHaveBeenCalled();
    expect(replies[0]).toContain("no orders yet");
  });

  it("falls back to rule replies when the agent is unavailable or fails", async () => {
    ai = makeAi(null);
    service = new ChatBotService(prisma as unknown as PrismaService, ai as unknown as never);
    vi.clearAllMocks();
    prisma.user.upsert.mockResolvedValue({ id: "bot-1" });
    prisma.message.findMany.mockResolvedValue([]);

    const replies = await service.buildReplies("t", "me", "hello bot");

    expect(ai.runAgentTurn).toHaveBeenCalledTimes(1);
    expect(replies[0]).toMatch(/hello|help/i);
  });
});

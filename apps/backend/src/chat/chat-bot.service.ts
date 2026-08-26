import { Injectable, Logger } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AiService, AgentTool } from "../ai/ai.service";

export const BOT_USERNAME = "champeybot";
const BOT_EMAIL = "champeybot@champey.local";

export type BotCommand =
  | { type: "start" }
  | { type: "help" }
  | { type: "find"; arg: string }
  | { type: "orders" }
  | { type: "dice" }
  | { type: "time" }
  | { type: "joke" }
  | { type: "greet" }
  | { type: "fallback" };

/** Pure command parser — exported for unit tests. */
export function parseCommand(raw: string): BotCommand {
  const text = raw.trim();
  if (text.startsWith("/")) {
    const [cmd, ...rest] = text.split(/\s+/);
    const arg = rest.join(" ").trim();
    switch (cmd.toLowerCase()) {
      case "/start":
        return { type: "start" };
      case "/help":
        return { type: "help" };
      case "/find":
      case "/products":
        return { type: "find", arg };
      case "/orders":
        return { type: "orders" };
      case "/dice":
        return { type: "dice" };
      case "/time":
        return { type: "time" };
      case "/joke":
        return { type: "joke" };
      default:
        return { type: "fallback" };
    }
  }
  if (/^(hi|hello|hey|suosdey|សួស្តី)(\s|$)/i.test(text)) return { type: "greet" };
  return { type: "fallback" };
}

const JOKES = [
  "Why did the smartphone go to school? It lost its contacts! 📱",
  "I asked the WiFi out on a date. It said: 'I feel a stronger connection elsewhere.'",
  "Khmer New Year resolution: stop dropping krama jokes. …ok one more: what do you call a fashionable scarf? A krama-va! 🧣",
  "Why don't programmers like nature? Too many bugs. 🐛",
];

const AGENT_SYSTEM_PROMPT = `You are Champey Bot, the AI shopping assistant living inside private chat on Khmer Online Shop (Champey) — a Cambodian marketplace with social feed, market and jobs.

Rules:
- Answer in the same language the user writes in (English, Khmer or Chinese).
- Be friendly, concise and practical. Plain text only, no markdown.
- When the user asks about products, prices or availability, CALL search_products and recommend only real results it returns (name, price, condition grade A = like new, B = good, C = fair). Never invent products.
- For order questions, CALL count_my_orders.
- To point users somewhere on the site use paths like /shop, /market, /orders, /community/resume.
- If you are unsure, suggest /help for the command list.`;

const AGENT_TOOLS: AgentTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search active products in the marketplace. Returns real listings with name, price in USD, stock and condition.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text product search keywords" },
          max_price: { type: "number", description: "Maximum price in USD" },
          condition: { type: "string", enum: ["A", "B", "C"], description: "Condition grade filter" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "count_my_orders",
      description: "Get how many orders the current user has, grouped by status.",
      parameters: { type: "object", properties: {} },
    },
  },
];

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);
  private cachedBotId: string | null = null;

  constructor(
    private prisma: PrismaService,
    private ai: AiService
  ) {}

  /** Idempotently ensure the built-in bot account exists and return its id. */
  async getBotUserId(): Promise<string> {
    if (this.cachedBotId) return this.cachedBotId;
    const user = await this.prisma.user.upsert({
      where: { username: BOT_USERNAME },
      update: {},
      create: {
        email: BOT_EMAIL,
        username: BOT_USERNAME,
        name: "Champey Bot",
        passwordHash: await bcrypt.hash(randomUUID(), 10),
      },
      select: { id: true },
    });
    this.cachedBotId = user.id;
    return user.id;
  }

  /**
   * True when the thread's other participant is the bot, i.e. every human
   * message in it deserves an automatic response.
   */
  async shouldRespond(threadId: string): Promise<boolean> {
    const botId = await this.getBotUserId();
    const participants = await this.prisma.threadParticipant.findMany({
      where: { threadId },
      select: { userId: true },
    });
    const ids = participants.map((p) => p.userId);
    return ids.includes(botId) && ids.length === 2;
  }

  /** Build the bot's reply messages for an incoming human message. */
  async buildReplies(threadId: string, senderId: string, content: string): Promise<string[]> {
    // Natural language goes to the LLM agent; explicit /commands stay deterministic.
    if (!content.trim().startsWith("/")) {
      const agentReply = await this.buildAgentReply(threadId, senderId);
      if (agentReply) return [agentReply];
    }

    const cmd = parseCommand(content);
    try {
      switch (cmd.type) {
        case "start":
          return [
            [
              "👋 Sua s'dey! I'm Champey Bot — your personal assistant.",
              "",
              "Here's what I can do:",
              "• /find <product> — search the marketplace",
              "• /orders — your order summary",
              "• /dice — roll a dice 🎲",
              "• /time — current time in Phnom Penh",
              "• /joke — brighten your day",
              "• /help — show this list",
            ].join("\n"),
          ];
        case "help":
          return [
            "Try:\n/find iphone\n/orders\n/dice\n/time\n/joke\n\nOr just say hi 🙂",
          ];
        case "greet":
          return ["Hello! 😊 How can I help? Type /help to see my commands."];
        case "find": {
          if (!cmd.arg) {
            return ["Which product are you looking for? e.g. /find iphone"];
          }
          const products = await this.prisma.product.findMany({
            where: {
              status: "ACTIVE",
              OR: [
                { name: { contains: cmd.arg } },
                { description: { contains: cmd.arg } },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { id: true, name: true, price: true, stock: true },
          });
          if (products.length === 0) {
            return [`No active products matched “${cmd.arg}”. Try another keyword? 🔍`];
          }
          const lines = products.map(
            (p) => `• ${p.name} — $${Number(p.price).toFixed(2)} (${p.stock} in stock)`
          );
          return [`🔍 Top matches for “${cmd.arg}”:\n${lines.join("\n")}`];
        }
        case "orders": {
          const [total, byStatus] = await Promise.all([
            this.prisma.order.count({ where: { userId: senderId } }),
            this.prisma.order.groupBy({
              by: ["status"],
              where: { userId: senderId },
              _count: { _all: true },
            }),
          ]);
          if (total === 0) return ["You have no orders yet. Browse the market and treat yourself! 🛍️"];
          const breakdown = byStatus
            .map((s) => `• ${s.status}: ${s._count._all}`)
            .join("\n");
          return [`📦 You have ${total} order${total === 1 ? "" : "s"}:\n${breakdown}`];
        }
        case "dice":
          return [`🎲 You rolled a ${1 + Math.floor(Math.random() * 6)}!`];
        case "time":
          return [
            `🕒 ${new Intl.DateTimeFormat("en-GB", {
              timeZone: "Asia/Phnom_Penh",
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date())} (Phnom Penh)`,
          ];
        case "joke":
          return [JOKES[Math.floor(Math.random() * JOKES.length)]];
        case "fallback":
          return [
            "I didn't quite get that 🤔 — type /help to see everything I can do, or /find <keyword> to search products.",
          ];
      }
    } catch (err) {
      this.logger.error("ChatBot buildReplies failed", err as Error);
      return ["⚠️ Sorry, something went wrong on my side. Please try again."];
    }
  }

  /**
   * LLM agent turn with tools (product search, order lookup). Uses recent
   * thread history for context. Returns null whenever AI is unavailable or
   * fails — the caller falls back to deterministic replies.
   */
  private async buildAgentReply(
    threadId: string,
    senderId: string
  ): Promise<string | null> {
    try {
      if (!this.ai.status().available) return null;

      const [botId, recent] = await Promise.all([
        this.getBotUserId(),
        this.prisma.message.findMany({
          where: { threadId },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { senderId: true, content: true },
        }),
      ]);

      const history = [
        { role: "system" as const, content: AGENT_SYSTEM_PROMPT },
        ...recent
          .reverse()
          .map((m) => ({
            role: m.senderId === botId ? ("assistant" as const) : ("user" as const),
            content: m.content,
          })),
      ];

      return await this.ai.runAgentTurn(history, AGENT_TOOLS, (name, argsJson) =>
        this.executeTool(name, argsJson, senderId)
      );
    } catch (err) {
      this.logger.warn("Agent reply fell back to rules", err as Error);
      return null;
    }
  }

  private async executeTool(name: string, argsJson: string, userId: string): Promise<unknown> {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
    } catch {
      throw new Error("invalid tool arguments");
    }

    switch (name) {
      case "search_products": {
        const query = typeof args.query === "string" ? args.query.trim() : "";
        if (!query) throw new Error("query is required");
        const products = await this.ai.findProducts({
          query,
          maxPrice:
            typeof args.max_price === "number" ? args.max_price : undefined,
          condition:
            args.condition === "A" || args.condition === "B" || args.condition === "C"
              ? args.condition
              : undefined,
        });
        return {
          results: products.map((p) => ({
            name: p.name,
            price: p.price,
            condition: p.condition,
            category: p.categoryName,
            url: `/shop/${p.id}`,
          })),
        };
      }
      case "count_my_orders": {
        const [total, byStatus] = await Promise.all([
          this.prisma.order.count({ where: { userId } }),
          this.prisma.order.groupBy({
            by: ["status"],
            where: { userId },
            _count: { _all: true },
          }),
        ]);
        return { total, byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })) };
      }
      default:
        throw new Error(`unknown tool: ${name}`);
    }
  }
}

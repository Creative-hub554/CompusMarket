import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { SearchService } from "../search/search.service";
import { ArticlesService } from "../articles/articles.service";
import { SiteKnowledgeService } from "./site-knowledge";

export interface AssistantProduct {
  id: string;
  name: string;
  price: number;
  condition: string;
  categoryName?: string;
  image?: string | null;
}

export interface GuideReply {
  reply: string;
  links: string[];
}

export interface SearchSpec {
  query?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: "A" | "B" | "C";
}

const KNOWN_SECTIONS = [
  "/market",
  "/feed",
  "/profile/edit",
  "/shop",
  "/cart",
  "/orders",
  "/warranties",
  "/community",
  "/community/careers",
  "/community/resume",
  "/community/flashcards",
  "/community/quizzes",
  "/community/diagrams",
  "/community/documents",
  "/community/notes",
  "/community/design",
  "/community/image-processor",
  "/seller/apply",
  "/seller/dashboard",
  "/support",
  "/messages",
  "/terms/buyer",
  "/terms/seller",
];

function extractSectionLinks(text: string): string[] {
  const matches = text.match(/\/[a-z]+(?:\/[a-z0-9\-[\]]+)*/g) ?? [];
  const found = new Set<string>();
  for (const match of matches) {
    for (const section of KNOWN_SECTIONS) {
      if (match === section || match.startsWith(section + "/")) {
        found.add(section);
      }
    }
  }
  return [...found].slice(0, 4);
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  zh: "Chinese",
  km: "Khmer",
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;
  private model: string;
  private fallbackModels: string[] = [];

  constructor(
    private readonly searchService: SearchService,
    private readonly articlesService: ArticlesService,
    private readonly siteKnowledge: SiteKnowledgeService,
  ) {
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const apiKey =
      openRouterKey && openRouterKey !== "sk-your-openai-api-key-here"
        ? openRouterKey
        : openaiKey && openaiKey !== "sk-your-openai-api-key-here"
          ? openaiKey
          : null;

    if (apiKey) {
      const baseURL =
        process.env.AI_BASE_URL?.trim() ||
        (openRouterKey ? "https://openrouter.ai/api/v1" : undefined);
      this.client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
      this.model = process.env.AI_MODEL?.trim() || "openai/gpt-4o-mini";
      const configuredFallbacks = (process.env.AI_FALLBACK_MODELS?.trim() || "")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      this.fallbackModels =
        configuredFallbacks.length > 0
          ? configuredFallbacks
          : openRouterKey
            ? ["z-ai/glm-5.2:free", "google/gemma-4-26b-a4b-it:free"]
            : [];
      this.logger.log(
        `AI client initialized (${openRouterKey ? "OpenRouter" : "OpenAI"}, model: ${this.model}${
          this.fallbackModels.length > 0 ? `, fallbacks: ${this.fallbackModels.join(", ")}` : ""
        })`,
      );
    } else {
      this.model = process.env.AI_MODEL?.trim() || "openai/gpt-4o-mini";
      this.logger.warn("No OpenRouter or OpenAI API key configured. AI features will return placeholder responses.");
    }
  }

  private isAvailable(): boolean {
    return this.client !== null;
  }

  /** Lets clients (and the frontend) know whether real generation is active. */
  status(): { available: boolean; model: string } {
    return { available: this.isAvailable(), model: this.model };
  }

  private modelChain(): string[] {
    return [this.model, ...this.fallbackModels.filter((m) => m !== this.model)];
  }

  private async chatWithRetry(
    params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    validate?: (response: OpenAI.Chat.ChatCompletion) => boolean,
  ): Promise<OpenAI.Chat.ChatCompletion> {
    let lastError: unknown;
    for (const model of this.modelChain()) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await this.client!.chat.completions.create({
            ...params,
            model,
          });
          if (!validate || validate(response)) {
            return response;
          }
          this.logger.warn(`Model ${model} returned invalid/empty output, trying next option`);
          lastError = new Error(`Model ${model} returned invalid output`);
          break;
        } catch (e) {
          lastError = e;
          const status = (e as { status?: number }).status;
          if (status === 401 || status === 403) {
            throw e;
          }
          if (status !== 429 || attempt === 2) {
            this.logger.warn(
              `Model ${model} failed (status ${status ?? "unknown"}), trying next option`,
            );
            break;
          }
          const metadata = (
            e as { error?: { metadata?: { retry_after_seconds?: number } } }
          ).error?.metadata;
          const delaySec = Math.min(Math.max(metadata?.retry_after_seconds ?? 4, 4), 15);
          this.logger.warn(`AI rate limited (429), retrying in ${delaySec}s`);
          await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
        }
      }
    }
    throw lastError;
  }

  async generateAssistantResponse(message: string, lang: string = "en", products: AssistantProduct[] = []) {
    if (!this.isAvailable()) {
      return this.mockResponse("I'm having trouble connecting to the AI service right now. Please try again later.");
    }

    const language = LANGUAGE_LABELS[lang] ?? "English";
    const productContext =
      products.length > 0
        ? `\n\nHere are the top matching products currently in the store (JSON):\n${JSON.stringify(
            products.map((p) => ({ name: p.name, price: p.price, condition: p.condition, category: p.categoryName })),
          )}\nRecommend these products by name and price based on what the shopper asked for. Be honest about condition grades (A = like new, B = good, C = fair). Do not invent extra products.`
        : `\n\nIf the user's message is about product search, extract relevant details and suggest what they might be looking for.`;

    const prompt = `You are a helpful AI assistant for Khmer Online Shop. The user is asking: "${message}".

Respond in ${language} with a friendly tone, helpful and concise.${productContext}

If the user's message is about careers/job matching, guide them to relevant career articles and suggest they create a resume if they don't have one.

Keep your response practical and focused on Khmer Online Shop. Respond in plain text without markdown.`;

    try {
      const response = await this.chatWithRetry(
        {
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        },
        (r) => !!r.choices[0]?.message?.content?.trim(),
      );
      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        this.logger.warn("AI returned empty content (possible reasoning-only output)");
        return this.mockResponse("I'm unable to provide a detailed response right now. Please try again later.");
      }
      return content;
    } catch (e) {
      this.logger.error("OpenAI API error", e);
      return this.mockResponse("I'm unable to provide a detailed response right now. Please try again later.");
    }
  }

  async generateGuideResponse(
    message: string,
    lang: string = "en",
    products: AssistantProduct[] = [],
    page?: string,
    hasResume?: boolean,
  ): Promise<GuideReply> {
    if (!this.isAvailable()) {
      return {
        reply: this.mockResponse("I'm having trouble connecting to the AI service right now. Please try again later."),
        links: [],
      };
    }

    const language = LANGUAGE_LABELS[lang] ?? "English";
    const knowledge = await this.siteKnowledge.build();
    const productContext =
      products.length > 0
        ? `\n\nMatching products found in the store (JSON):\n${JSON.stringify(
            products.map((p) => ({ name: p.name, price: p.price, condition: p.condition, category: p.categoryName })),
          )}\nRecommend these products by name and price. Be honest about condition grades (A = like new, B = good, C = fair). Do not invent extra products.`
        : `\n\nNo store products matched this message. If the user seems to be shopping, suggest what to search for or point them to /shop or /market.`;
    const pageContext = page
      ? `\n\nThe user is currently on the page: ${page}. Tailor your guidance to that context when relevant.`
      : "";
    const resumeContext =
      hasResume === true
        ? "\nThe user already has a resume on the site."
        : hasResume === false
          ? "\nThe user does not have a resume yet; if career help is relevant, suggest building one at /community/resume."
          : "";

    const prompt = `You are the friendly AI guide for Khmer Online Shop, an online marketplace with free community tools. You help users discover the site, find products, and get ideas.

Site knowledge:
${knowledge}

The user says: "${message}"${pageContext}${resumeContext}${productContext}

Rules:
- Respond in ${language}, friendly and concise.
- Act as a guide: explain what the site offers, give ideas and suggestions, and always propose a concrete next step.
- When a suggestion maps to a section of the site, mention its path inline, e.g. "browse /market" or "build your resume at /community/resume". Only use paths from the site knowledge above.
- Never invent products, prices, sellers, articles or features that are not listed in the site knowledge or product data.
- Respond in plain text without markdown.`;

    try {
      const response = await this.chatWithRetry(
        {
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        },
        (r) => !!r.choices[0]?.message?.content?.trim(),
      );
      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        this.logger.warn("AI returned empty content (possible reasoning-only output)");
        return {
          reply: this.mockResponse("I'm unable to provide a detailed response right now. Please try again later."),
          links: [],
        };
      }
      return { reply: content, links: extractSectionLinks(content) };
    } catch (e) {
      this.logger.error("OpenAI API error", e);
      return {
        reply: this.mockResponse("I'm unable to provide a detailed response right now. Please try again later."),
        links: [],
      };
    }
  }

  async extractSearchSpec(userMessage: string, lang: string = "en"): Promise<SearchSpec | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const language = LANGUAGE_LABELS[lang] ?? "English";
    const prompt = `You are an AI assistant that extracts search specifications from user queries for a product marketplace.

Given a user message in ${language}: "${userMessage}"

Extract the following information (return as JSON):
- query: string (main search term, optional)
- categoryId: string (category ID if mentioned, optional)
- minPrice: number (minimum price in USD if mentioned, optional)
- maxPrice: number (maximum price in USD if mentioned, optional)
- condition: string (product condition like 'A', 'B', 'C' if mentioned, optional)

Condition grades: A = like new/mint, B = good, C = fair/heavily used.

Only include fields that are clearly present in the user's message. If no search-related intent is detected, return null.

Return only valid JSON.`;

    try {
      const response = await this.chatWithRetry({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content || "";
      return this.normalizeSearchSpec(this.parseJsonOrNull(raw));
    } catch (e) {
      this.logger.error("Failed to extract search spec", e);
      return null;
    }
  }

  private parseJsonOrNull(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Model output is untrusted: drop wrong-typed fields, coerce numeric
   * strings, and ignore the spec entirely when nothing usable remains.
   */
  private normalizeSearchSpec(parsed: unknown): SearchSpec | null {
    if (typeof parsed !== "object" || parsed === null) return null;
    const raw = parsed as Record<string, unknown>;
    const spec: SearchSpec = {};

    if (typeof raw.query === "string" && raw.query.trim()) spec.query = raw.query.trim();
    if (typeof raw.categoryId === "string" && raw.categoryId.trim()) {
      spec.categoryId = raw.categoryId.trim();
    }
    for (const key of ["minPrice", "maxPrice"] as const) {
      const n = Number(raw[key]);
      if (raw[key] !== null && raw[key] !== undefined && raw[key] !== "" && Number.isFinite(n)) {
        spec[key] = n;
      }
    }
    if (raw.condition === "A" || raw.condition === "B" || raw.condition === "C") {
      spec.condition = raw.condition;
    }

    return Object.keys(spec).length > 0 ? spec : null;
  }

  async findProducts(spec: {
    query?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
  }): Promise<AssistantProduct[]> {
    if (!spec.query) return [];

    const filters: { categoryId?: string; minPrice?: number; maxPrice?: number; condition?: string } = {};
    if (spec.categoryId) filters.categoryId = spec.categoryId;
    if (typeof spec.minPrice === "number") filters.minPrice = spec.minPrice;
    if (typeof spec.maxPrice === "number") filters.maxPrice = spec.maxPrice;
    if (spec.condition === "A" || spec.condition === "B" || spec.condition === "C") {
      filters.condition = spec.condition;
    }

    try {
      const result = await this.searchService.search(spec.query, filters);
      return (result.hits as Array<Record<string, unknown>>).slice(0, 5).map((hit) => ({
        id: String(hit.id),
        name: String(hit.name ?? ""),
        price: Number(hit.price ?? 0),
        condition: String(hit.condition ?? ""),
        categoryName: hit.categoryName ? String(hit.categoryName) : undefined,
        image: Array.isArray(hit.images) && hit.images.length > 0 ? String(hit.images[0]) : null,
      }));
    } catch (e) {
      this.logger.error("Assistant product search failed", e);
      return [];
    }
  }

  async extractCareerMatch(userMessage: string, lang: string = "en") {
    if (!this.isAvailable()) {
      return { needsResume: true, message: this.mockResponse("I'm having trouble analyzing your message. Please try again later.") };
    }

    let articleContext = "";
    try {
      const articles = await this.articlesService.findAllPublished();
      const listed = articles.slice(0, 30).map((a) => `${a.slug} | ${a.title} | category=${a.category}`);
      if (listed.length > 0) {
        articleContext = `\n\nPublished career articles you can recommend (slug | title | category):\n${listed.join("\n")}\nWhen suggesting articles, mention their titles.`;
      }
    } catch {
      // Article enrichment is best-effort only.
    }

    const language = LANGUAGE_LABELS[lang] ?? "English";
    const prompt = `You are an AI career advisor. Given a user message in ${language}: "${userMessage}"
${articleContext}

First, determine if the user has a resume (based on content, or if they mentioned not having one).
If they have a resume, extract keywords like skills, target roles, experience, and suggest relevant career articles from the available categories.
If they don't have a resume, provide guidance on creating one and suggest specific articles that can help with resume building.

Return a JSON with:
- needsResume: boolean (true if user doesn't have a resume or it's not clear)
- message: string (in ${language}) with career guidance
- articleCategories: array of strings (like "RESUME_EXAMPLES", "JOB_SEARCH") that are relevant

If they have a resume and you can extract skills/target roles, return:
- needsResume: false
- extractedSkills: array of skills (strings)
- extractedTargetRoles: array of target roles (strings)
- message: string with matching guidance

Return only valid JSON.`;

    try {
      const response = await this.chatWithRetry({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content || "";
      const parsed = this.parseJsonOrNull(raw) as Record<string, unknown> | null;
      if (
        parsed &&
        typeof parsed.needsResume === "boolean" &&
        typeof parsed.message === "string" &&
        parsed.message.trim()
      ) {
        return parsed;
      }
      return { needsResume: true, message: this.mockResponse("I'm having trouble analyzing your message. Please try again later.") };
    } catch (e) {
      this.logger.error("Failed to extract career match", e);
      return { needsResume: true, message: this.mockResponse("I'm having trouble analyzing your message. Please try again later.") };
    }
  }

  async generateProductDescription(name: string, category: string, condition: string, keywords?: string) {
    if (!this.isAvailable()) {
      return this.mockResponse(`A quality ${condition} ${name} in great condition. Perfect for everyday use.`);
    }

    const prompt = `Generate a compelling product description for a second-hand electronics marketplace in Cambodia.
Product: ${name}
Category: ${category}
Condition: ${condition}
${keywords ? `Keywords to include: ${keywords}` : ""}

The description should be:
- 2-3 sentences
- Highlight value for money
- Mention condition honestly
- Sound trustworthy and professional
- In English
- No markdown, just plain text`;

    try {
      const response = await this.chatWithRetry(
        {
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
          temperature: 0.7,
        },
        (r) => !!r.choices[0]?.message?.content?.trim(),
      );
      return response.choices[0]?.message?.content || "";
    } catch (e) {
      this.logger.error("OpenAI API error", e);
      return this.mockResponse(`High-quality ${condition} ${name} available. Fully tested and working. Great value for budget-conscious buyers.`);
    }
  }

  async improveResumeSummary(summary: string, targetRole?: string) {
    if (!this.isAvailable()) {
      return this.mockResponse(summary || "Experienced professional seeking new opportunities.");
    }

    const prompt = `Improve this resume summary for a job seeker in Cambodia${targetRole ? ` targeting a ${targetRole} role` : ""}.

Original: "${summary}"

Requirements:
- Professional but natural tone
- 2-3 sentences
- Highlight key strengths
- Keep it concise
- Plain text only
- Suitable for Cambodian job market`;

    try {
      const response = await this.chatWithRetry(
        {
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
          temperature: 0.7,
        },
        (r) => !!r.choices[0]?.message?.content?.trim(),
      );
      return response.choices[0]?.message?.content || summary;
    } catch (e) {
      this.logger.error("OpenAI API error", e);
      return summary;
    }
  }

  async improveExperienceDescription(description: string, position: string, company: string) {
    if (!this.isAvailable()) {
      return this.mockResponse(description || `Worked at ${company} as ${position}.`);
    }

    const prompt = `Rewrite this work experience description to be more impactful for a Cambodian job application.

Position: ${position}
Company: ${company}
Current description: "${description}"

Requirements:
- Start with strong action verbs
- Include measurable achievements where possible
- Professional tone
- 2-3 bullet points format
- Plain text only`;

    try {
      const response = await this.chatWithRetry(
        {
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
          temperature: 0.7,
        },
        (r) => !!r.choices[0]?.message?.content?.trim(),
      );
      return response.choices[0]?.message?.content || description;
    } catch (e) {
      this.logger.error("OpenAI API error", e);
      return description;
    }
  }

  async generateCoverLetter(
    fullName: string,
    targetRole: string,
    company: string,
    skills: string[],
    experience: string,
  ) {
    if (!this.isAvailable()) {
      return this.mockResponse(`Dear Hiring Manager,

I am writing to express my interest in the ${targetRole} position at ${company}. With my skills in ${skills.slice(0, 3).join(", ")}, I believe I would be a great addition to your team.

Sincerely,
${fullName}`);
    }

    const prompt = `Write a professional cover letter for a job application in Cambodia.

Applicant: ${fullName}
Position: ${targetRole}
Company: ${company}
Key skills: ${skills.join(", ")}
Relevant experience: ${experience}

Requirements:
- Formal but warm tone
- 3-4 short paragraphs
- Include greeting and closing
- Plain text only
- Suitable for Cambodian workplace culture`;

    try {
      const response = await this.chatWithRetry(
        {
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 400,
          temperature: 0.7,
        },
        (r) => !!r.choices[0]?.message?.content?.trim(),
      );
      return response.choices[0]?.message?.content || "";
    } catch (e) {
      this.logger.error("OpenAI API error", e);
      return "Unable to generate cover letter at this time.";
    }
  }

  private mockResponse(fallback: string): string {
    return fallback;
  }
}

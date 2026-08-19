import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;

  constructor() {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_BASE_URL;
    const model = process.env.AI_MODEL;

    const apiKey = openRouterKey && openRouterKey !== "sk-your-openai-api-key-here" ? openRouterKey : (openaiKey && openaiKey !== "sk-your-openai-api-key-here" ? openaiKey : null);

    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
      this.logger.log(`AI client initialized (model: ${model || 'default'}, baseURL: ${baseURL || 'default'})`);
    } else {
      this.logger.warn("No OpenRouter or OpenAI API key configured. AI features will return placeholder responses.");
    }
  }

  private isAvailable(): boolean {
    return this.client !== null;
  }

  async generateAssistantResponse(message: string, lang: string = "en") {
    if (!this.isAvailable()) {
      return this.mockResponse("I'm having trouble connecting to the AI service right now. Please try again later.");
    }

    const prompt = `You are a helpful AI assistant for Khmer Online Shop. The user is asking: "${message}". 

Respond in ${lang === "en" ? "English" : lang === "km" ? "Khmer" : "Chinese"} with a friendly tone, helpful and concise.

If the user's message is about product search, extract relevant details and suggest what they might be looking for.

If the user's message is about careers/job matching, guide them to relevant career articles and suggest they create a resume if they don't have one.

Keep your response practical and focused on Khmer Online Shop. Respond in plain text without markdown.`;

    try {
      const response = await this.client!.chat.completions.create({
        model: process.env.AI_MODEL || "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content || "";
    } catch (e) {
      this.logger.error("OpenAI API error", e);
      return this.mockResponse("I'm unable to provide a detailed response right now. Please try again later.");
    }
  }

  async extractSearchSpec(userMessage: string, lang: string = "en") {
    if (!this.isAvailable()) {
      return null;
    }

    const prompt = `You are an AI assistant that extracts search specifications from user queries for a product marketplace.

Given a user message in ${lang === "en" ? "English" : lang === "km" ? "Khmer" : "Chinese"}: "${userMessage}"

Extract the following information (return as JSON):
- query: string (main search term, optional)
- categoryId: string (category ID if mentioned, optional)
- minPrice: number (minimum price in USD if mentioned, optional)
- maxPrice: number (maximum price in USD if mentioned, optional)
- condition: string (product condition like 'A', 'B', 'C' if mentioned, optional)

Only include fields that are clearly present in the user's message. If no search-related intent is detected, return null.

Return only valid JSON.`;

    try {
      const response = await this.client!.chat.completions.create({
        model: process.env.AI_MODEL || "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch {
        return null;
      }
    } catch (e) {
      this.logger.error("Failed to extract search spec", e);
      return null;
    }
  }

  async extractCareerMatch(userMessage: string, lang: string = "en") {
    if (!this.isAvailable()) {
      return { needsResume: true, message: this.mockResponse("I'm having trouble accessing the AI service right now. Please try again later.") };
    }

    const prompt = `You are an AI career advisor. Given a user message in ${lang === "en" ? "English" : lang === "km" ? "Khmer" : "Chinese"}: "${userMessage}"

First, determine if the user has a resume (based on content, or if they mentioned not having one).
If they have a resume, extract keywords like skills, target roles, experience, and suggest relevant career articles from the available categories.
If they don't have a resume, provide guidance on creating one and suggest specific articles that can help with resume building.

Return a JSON with:
- needsResume: boolean (true if user doesn't have a resume or it's not clear)
- message: string (in the same language) with career guidance
- articleCategories: array of strings (like "RESUME_EXAMPLES", "JOB_SEARCH") that are relevant

If they have a resume and you can extract skills/target roles, return:
- needsResume: false
- extractedSkills: array of skills (strings)
- extractedTargetRoles: array of target roles (strings)
- message: string with matching guidance

Return only valid JSON.`;

    try {
      const response = await this.client!.chat.completions.create({
        model: process.env.AI_MODEL || "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 250,
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch {
        return { needsResume: true, message: this.mockResponse("I'm having trouble analyzing your message. Please try again later.") };
      }
    } catch (e) {
      this.logger.error("Failed to extract career match", e);
      return { needsResume: true, message: this.mockResponse("I'm having trouble analyzing your message. Please try again later.") };
    }
  }

  private mockResponse(fallback: string): string {
    return fallback;
  }
}
import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== "sk-your-openai-api-key-here") {
      this.client = new OpenAI({ apiKey });
      this.logger.log("OpenAI client initialized");
    } else {
      this.logger.warn("OpenAI API key not configured. AI features will return placeholder responses.");
    }
  }

  private isAvailable(): boolean {
    return this.client !== null;
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
      const response = await this.client!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });
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
      const response = await this.client!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });
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
      const response = await this.client!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 250,
        temperature: 0.7,
      });
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
      const response = await this.client!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.7,
      });
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
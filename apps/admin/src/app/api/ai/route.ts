import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import OpenAI from "openai";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-your-openai-api-key-here") return null;
  return new OpenAI({ apiKey });
}

async function callAi(client: OpenAI | null, prompt: string, fallback: string): Promise<string> {
  if (!client) return fallback;
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content || fallback;
  } catch (err) {
    console.error("AI API error:", err);
    return fallback;
  }
}

async function callAiJson(client: OpenAI | null, prompt: string, fallback: unknown, maxTokens: number): Promise<any> {
  if (!client) return fallback;
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    const parsed = parseJson(response.choices[0]?.message?.content || "");
    return parsed ?? fallback;
  } catch (err) {
    console.error("AI JSON API error:", err);
    return fallback;
  }
}

function parseJson(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function sanitizeArticle(raw: any): { title: string; excerpt: string; content: string; tags: string[] } {
  return {
    title: typeof raw?.title === "string" && raw.title.trim() ? raw.title.trim() : "Untitled Article",
    excerpt: typeof raw?.excerpt === "string" ? raw.excerpt.trim() : "",
    content: typeof raw?.content === "string" ? raw.content.trim() : "",
    tags: Array.isArray(raw?.tags)
      ? raw.tags.filter((t: any) => typeof t === "string" && t.trim()).map((t: string) => t.trim()).slice(0, 6)
      : [],
  };
}

function mockArticle(topic: string, category: string, lang: string): { title: string; excerpt: string; content: string; tags: string[] } {
  const en = lang !== "Khmer";
  const heading = en ? `A Guide to ${topic}` : `មគ្គុទ្ទេសក៍អំពី ${topic}`;
  const intro = en
    ? `## Introduction\n\nThis article explores ${topic} and how it relates to the "${category.replace(/_/g, " ").toLowerCase()}" category. Understanding this topic is valuable for job seekers and professionals in Cambodia.`
    : `## សេចក្តីផ្តើម\n\nអត្ថបទនេះស្វែងយល់អំពី ${topic} និងទំនាក់ទំនងរបស់វាជាមួយប្រភេទ "${category.replace(/_/g, " ").toLowerCase()}"។ ការយល់ដឹងអំពីប្រធានបទនេះមានសារៈសំខាន់សម្រាប់អ្នកស្វែងរកការងារ និងអ្នកជំនាញនៅកម្ពុជា។`;
  const section2 = en
    ? `## Key Points\n\n- Understand the fundamentals of ${topic}.\n- Apply practical techniques to improve your skills.\n- Learn from real-world examples in the Cambodian market.`
    : `## ចំណុចសំខាន់ៗ\n\n- យល់ពីមូលដ្ឋានគ្រឹះនៃ ${topic}។\n- អនុវត្តបច្ចេកទេសជាក់ស្តែងដើម្បីកែលម្អជំនាញ។\n- រៀនពីឧទាហរណ៍ជាក់ស្តែងក្នុងទីផ្សារកម្ពុជា។`;
  const conclusion = en
    ? `## Conclusion\n\n${topic} is an important area to develop. Use this guide as a starting point and keep building your knowledge step by step.`
    : `## សេចក្តីសន្និដ្ឋាន\n\n${topic} គឺជាវិស័យសំខាន់ដែលគួរអភិវឌ្ឍ។ សូមប្រើមគ្គុទ្ទេសក៍នេះជាចំណុចចាប់ផ្តើម ហើយបន្តពង្រឹងចំណេះដឹងរបស់អ្នកមួយជំហានម្តងៗ។`;
  return {
    title: heading,
    excerpt: en ? `Learn about ${topic} and why it matters for your career in Cambodia.` : `ស្វែងយល់អំពី ${topic} និងមូលហេតុដែលវាសំខាន់សម្រាប់អាជីពរបស់អ្នកនៅកម្ពុជា។`,
    content: `${heading}\n\n${intro}\n\n${section2}\n\n${conclusion}`,
    tags: [en ? topic : topic, en ? "Career" : "អាជីព", category.replace(/_/g, " ").toLowerCase()].filter(Boolean),
  };
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, data } = body;
  const client = getClient();

  if (action === "describe-product") {
    const prompt = `Generate a short product description for a second-hand electronics marketplace.
Product: ${data.name}
Category: ${data.category}
Condition: ${data.condition}
2-3 sentences, plain text, honest about condition.`;
    const result = await callAi(client, prompt, `A quality ${data.condition} ${data.name} in great condition.`);
    return NextResponse.json({ result });
  }

  if (action === "generate-article") {
    if (!data?.topic || !data?.category) {
      return NextResponse.json({ error: "topic and category are required" }, { status: 400 });
    }
    const lang = data.language === "km" ? "Khmer" : "English";
    const prompt = `Write a career resource article entirely in ${lang} for job seekers in Cambodia.
Topic: ${data.topic}
Category: ${data.category.replace(/_/g, " ").toLowerCase()}

Output a JSON object with exactly these keys:
{
  "title": "A clear article title",
  "excerpt": "One or two sentences summarizing the article",
  "content": "Full article in Markdown, 800-1200 words, with ## section headings",
  "tags": ["tag1", "tag2", "tag3"]
}

Requirements:
- Practical, accurate, and actionable advice
- Suitable for the ${data.category.replace(/_/g, " ").toLowerCase()} category
- Return ONLY valid JSON, no markdown fences`;
    const result = sanitizeArticle(await callAiJson(client, prompt, mockArticle(data.topic, data.category, lang), 1800));
    return NextResponse.json({ result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
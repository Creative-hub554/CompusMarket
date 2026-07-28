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

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
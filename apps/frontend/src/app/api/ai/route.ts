import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import OpenAI from "openai";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-your-openai-api-key-here") return null;
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
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

  if (action === "resume/improve-summary") {
    const prompt = `Improve this resume summary for a Cambodian job seeker${data.targetRole ? ` targeting a ${data.targetRole} role` : ""}.
Original: "${data.summary}"
2-3 sentences, professional tone, plain text.`;
    const result = await callAi(client, prompt, data.summary || "Experienced professional seeking new opportunities.");
    return NextResponse.json({ result });
  }

  if (action === "resume/improve-experience") {
    const prompt = `Rewrite this work experience description for a Cambodian job application.
Position: ${data.position}
Company: ${data.company}
Description: "${data.description}"
2-3 bullet points with action verbs, plain text.`;
    const result = await callAi(client, prompt, data.description || `Worked at ${data.company} as ${data.position}.`);
    return NextResponse.json({ result });
  }

  if (action === "resume/cover-letter") {
    const prompt = `Write a professional cover letter for a job in Cambodia.
Name: ${data.fullName}
Role: ${data.targetRole}
Company: ${data.company}
Skills: ${(data.skills || []).join(", ")}
Experience: ${data.experience}
3-4 paragraphs, formal but warm, plain text.`;
    const result = await callAi(client, prompt, `Dear Hiring Manager,\n\nI am writing to express my interest in the ${data.targetRole} position at ${data.company}.\n\nSincerely,\n${data.fullName}`);
    return NextResponse.json({ result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
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
  } catch {
    return fallback;
  }
}
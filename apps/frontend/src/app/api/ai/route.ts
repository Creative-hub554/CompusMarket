import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
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

  if (action === "generate-note") {
    if (!data?.topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });
    const lang = data.language === "km" ? "Khmer" : "English";
    const prompt = `Generate study note content written entirely in ${lang}.
Topic: ${data.topic}

Output a JSON object with exactly these keys:
{
  "title": "A concise note title",
  "content": "Markdown study note, 300-500 words, organized with ## section headings, accurate and clear"
}

Return ONLY valid JSON, no markdown fences.`;
    const result = await callAiJson(client, prompt, mockNote(data.topic, lang), 700);
    return NextResponse.json({ result });
  }

  if (action === "generate-quiz") {
    if (!data?.topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });
    const lang = data.language === "km" ? "Khmer" : "English";
    const count = clampNumber(data.numberOfQuestions, 3, 10, 5);
    const prompt = `Generate a quiz written entirely in ${lang}.
Topic: ${data.topic}
Number of questions: ${count}

Output a JSON object with exactly these keys:
{
  "title": "A concise quiz title",
  "description": "One sentence describing the quiz",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "question": "The question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "the exact correct option text",
      "points": 1
    }
  ]
}

Requirements:
- Exactly ${count} questions
- Every question has exactly 4 options
- correctAnswer must exactly match one of the options
- Vary which option is correct
- Return ONLY valid JSON, no markdown fences`;
    const result = sanitizeQuiz(await callAiJson(client, prompt, mockQuiz(data.topic, lang), 1500), count);
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
  } catch {
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

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.round(value) : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeQuiz(raw: any, count: number) {
  const questions = Array.isArray(raw?.questions) ? raw.questions : [];
  const sanitized = questions
    .filter((q: any) => typeof q?.question === "string" && q.question.trim() && typeof q?.correctAnswer === "string")
    .slice(0, count)
    .map((q: any) => {
      let options: string[] = Array.isArray(q.options) ? q.options.filter((o: any) => typeof o === "string" && o.trim()) : [];
      if (options.length < 2) options = ["Option A", "Option B", "Option C", "Option D"];
      options = options.slice(0, 4);
      if (!options.includes(q.correctAnswer)) options[0] = q.correctAnswer;
      return {
        type: "MULTIPLE_CHOICE",
        question: q.question.trim(),
        options,
        correctAnswer: q.correctAnswer,
        points: typeof q.points === "number" && q.points > 0 ? Math.round(q.points) : 1,
      };
    });
  return {
    title: typeof raw?.title === "string" && raw.title.trim() ? raw.title.trim() : (raw?.title || "Quiz"),
    description: typeof raw?.description === "string" ? raw.description.trim() : "",
    questions: sanitized,
  };
}

function mockNote(topic: string, lang: string): { title: string; content: string } {
  if (lang === "Khmer") {
    return {
      title: `${topic} — កំណត់ចំណាំសិក្សា`,
      content: `# ${topic}\n\n## សេចក្តីផ្តើម\n\nនេះជាកំណត់ចំណាំសិក្សាអំពី ${topic}។ សូមអានដោយយកចិត្តទុកដាក់ ហើយពិនិត្យឡើងវិញជាប្រចាំ។\n\n## ចំណុចសំខាន់ៗ\n\n- ចំណុចសំខាន់ទីមួយអំពី ${topic}\n- ចំណុចសំខាន់ទីពីរអំពី ${topic}\n- ចំណុចសំខាន់ទីបីអំពី ${topic}\n\n## សង្ខេប\n\nសូមសង្ខេបគំនិតសំខាន់ៗ ហើយសាកល្បងអនុវត្តលើឧទាហរណ៍ជាក់ស្តែង។`,
    };
  }
  return {
    title: `${topic} — Study Notes`,
    content: `# ${topic}\n\n## Introduction\n\nThese study notes cover ${topic}. Read carefully and review regularly.\n\n## Key Points\n\n- First key point about ${topic}\n- Second key point about ${topic}\n- Third key point about ${topic}\n\n## Summary\n\nSummarize the main ideas and test yourself with practical examples.`,
  };
}

function mockQuiz(topic: string, lang: string): { title: string; description: string; questions: any[] } {
  const en = lang !== "Khmer";
  const questions = [
    {
      type: "MULTIPLE_CHOICE",
      question: en ? `What is ${topic} primarily about?` : `តើ ${topic} គឺផ្តោតលើអ្វី?`,
      options: en ? ["Its core concepts", "Its history", "Its future", "Its creators"] : ["គំនិតស្នូល", "ប្រវត្តិរបស់វា", "អនាគតរបស់វា", "អ្នកបង្កើតរបស់វា"],
      correctAnswer: en ? "Its core concepts" : "គំនិតស្នូល",
      points: 1,
    },
    {
      type: "MULTIPLE_CHOICE",
      question: en ? `Which statement about ${topic} is correct?` : `តើសេចក្តីថ្លែងណាមួយអំពី ${topic} ត្រឹមត្រូវ?`,
      options: en ? ["It is a real-world topic", "It is purely imaginary", "It does not exist", "It is unlearnable"] : ["វាជាប្រធានបទពិត", "វាជារឿងស្រមើស្រមៃ", "វាមិនមានទេ", "វាមិនអាចរៀនបាន"],
      correctAnswer: en ? "It is a real-world topic" : "វាជាប្រធានបទពិត",
      points: 1,
    },
    {
      type: "MULTIPLE_CHOICE",
      question: en ? "What is the best way to study this topic?" : "តើវិធីល្អបំផុតក្នុងការសិក្សាប្រធានបទនេះគឺអ្វី?",
      options: en ? ["Review and practice", "Never study", "Only memorize", "Skip it"] : ["ពិនិត្យឡើងវិញ និងអនុវត្ត", "មិនដែលសិក្សា", "គ្រាន់តែចងចាំ", "រំលងវា"],
      correctAnswer: en ? "Review and practice" : "ពិនិត្យឡើងវិញ និងអនុវត្ត",
      points: 1,
    },
  ];
  return {
    title: en ? `${topic} Quiz` : `សំណួរ ${topic}`,
    description: en ? `A practice quiz about ${topic}.` : `សំណួរហាត់អំពី ${topic}។`,
    questions,
  };
}
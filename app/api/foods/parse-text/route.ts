import { NextRequest, NextResponse } from "next/server";
import { parseFoodFromText } from "@/lib/anthropic";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ text: z.string().min(1).max(2000) });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI not configured. Set ANTHROPIC_API_KEY to enable natural-language input." },
      { status: 503 }
    );
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  try {
    const items = await parseFoodFromText(parsed.data.text);
    return NextResponse.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { parseFoodFromImage } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI not configured. Set ANTHROPIC_API_KEY to enable photo input." },
      { status: 503 }
    );
  }
  const form = await req.formData();
  const file = form.get("image");
  const caption = (form.get("caption") as string | null) || undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 8 MB)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  try {
    const items = await parseFoodFromImage(
      base64,
      file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      caption
    );
    return NextResponse.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

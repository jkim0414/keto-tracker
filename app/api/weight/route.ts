import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { weightLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { localDateString } from "@/lib/date";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const logs = await db
    .select()
    .from(weightLogs)
    .orderBy(desc(weightLogs.loggedAt))
    .limit(365);
  return NextResponse.json({ logs });
}

const postSchema = z.object({
  weightKg: z.number().positive().max(1000),
  notes: z.string().max(500).optional(),
  loggedAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const loggedAt = data.loggedAt ? new Date(data.loggedAt) : new Date();
  const [log] = await db
    .insert(weightLogs)
    .values({
      weightKg: data.weightKg.toString(),
      notes: data.notes,
      loggedAt,
      localDate: localDateString(loggedAt),
    })
    .returning();
  return NextResponse.json({ log });
}

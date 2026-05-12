import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

async function getOrCreate() {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db.insert(settings).values({ id: 1 }).returning();
  return row;
}

export async function GET() {
  const row = await getOrCreate();
  return NextResponse.json({ settings: row });
}

const patchSchema = z.object({
  dailyNetCarbGoal: z.number().min(0).max(500).optional(),
  weightUnit: z.enum(["lb", "kg"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  await getOrCreate();
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.dailyNetCarbGoal !== undefined) {
    update.dailyNetCarbGoal = parsed.data.dailyNetCarbGoal.toString();
  }
  if (parsed.data.weightUnit) {
    update.weightUnit = parsed.data.weightUnit;
  }
  const [row] = await db
    .update(settings)
    .set(update)
    .where(eq(settings.id, 1))
    .returning();
  return NextResponse.json({ settings: row });
}

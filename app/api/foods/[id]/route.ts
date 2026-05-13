import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(foodEntries).where(eq(foodEntries.id, numId));
  return NextResponse.json({ ok: true });
}

// Only servings is editable. Per-serving carbs, name, and serving description
// are immutable properties of the logged food — they describe what was eaten.
// Changing servings rescales the total net carbs.
const patchSchema = z.object({
  servings: z.number().positive().max(1000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const [existing] = await db
    .select()
    .from(foodEntries)
    .where(eq(foodEntries.id, numId))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const perServing = parseFloat(
    existing.netCarbsPerServingG ?? existing.netCarbsG
  );
  const totalG = Math.round(parsed.data.servings * perServing * 10) / 10;
  const [entry] = await db
    .update(foodEntries)
    .set({
      servings: parsed.data.servings.toString(),
      netCarbsG: totalG.toString(),
    })
    .where(eq(foodEntries.id, numId))
    .returning();
  return NextResponse.json({ entry });
}

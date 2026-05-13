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

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  netCarbsG: z.number().min(0).max(1000).optional(),
  servingDescription: z.string().max(200).nullable().optional(),
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
  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.netCarbsG !== undefined)
    update.netCarbsG = parsed.data.netCarbsG.toString();
  if (parsed.data.servingDescription !== undefined)
    update.servingDescription = parsed.data.servingDescription;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  const [entry] = await db
    .update(foodEntries)
    .set(update)
    .where(eq(foodEntries.id, numId))
    .returning();
  return NextResponse.json({ entry });
}

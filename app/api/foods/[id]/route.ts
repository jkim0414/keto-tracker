import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

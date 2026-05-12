import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodEntries } from "@/lib/db/schema";
import { searchFoods } from "@/lib/openfoodfacts";
import { localDateString } from "@/lib/date";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const date = searchParams.get("date");

  if (q) {
    const results = await searchFoods(q, 12);
    return NextResponse.json({ results });
  }

  const where = date
    ? and(gte(foodEntries.localDate, date), lte(foodEntries.localDate, date))
    : undefined;

  const entries = await db
    .select()
    .from(foodEntries)
    .where(where)
    .orderBy(desc(foodEntries.eatenAt))
    .limit(200);
  return NextResponse.json({ entries });
}

const postSchema = z.object({
  name: z.string().min(1).max(200),
  netCarbsG: z.number().min(0).max(1000),
  servingDescription: z.string().max(200).optional(),
  servingGrams: z.number().positive().optional(),
  source: z.enum(["search", "barcode", "text", "photo", "manual"]),
  rawInput: z.string().max(2000).optional(),
  barcode: z.string().max(50).optional(),
  eatenAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const eatenAt = data.eatenAt ? new Date(data.eatenAt) : new Date();
  const [entry] = await db
    .insert(foodEntries)
    .values({
      name: data.name,
      netCarbsG: data.netCarbsG.toString(),
      servingDescription: data.servingDescription,
      servingGrams: data.servingGrams?.toString(),
      source: data.source,
      rawInput: data.rawInput,
      barcode: data.barcode,
      eatenAt,
      localDate: localDateString(eatenAt),
    })
    .returning();
  return NextResponse.json({ entry });
}

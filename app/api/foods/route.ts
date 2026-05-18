import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodEntries } from "@/lib/db/schema";
import { searchFoods, type OFFFood } from "@/lib/openfoodfacts";
import { searchFoodsUSDA } from "@/lib/usda";
import { cleanServingDescription } from "@/lib/serving";
import { localDateString } from "@/lib/date";
import { desc, eq, and, gte, lte, ilike } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const date = searchParams.get("date");

  if (q) {
    // Three lookups in parallel:
    //  - Your own foods (ILIKE name match on food_entries) — favored
    //  - USDA FoodData Central — gold standard for generic foods
    //  - OpenFoodFacts — good for branded/scanned products
    const [recentRaw, usda, off] = await Promise.all([
      db
        .select({
          name: foodEntries.name,
          netCarbsG: foodEntries.netCarbsG,
          netCarbsPerServingG: foodEntries.netCarbsPerServingG,
          servingDescription: foodEntries.servingDescription,
          source: foodEntries.source,
          eatenAt: foodEntries.eatenAt,
        })
        .from(foodEntries)
        .where(ilike(foodEntries.name, `%${q}%`))
        .orderBy(desc(foodEntries.eatenAt))
        .limit(50),
      searchFoodsUSDA(q, 6),
      searchFoods(q, 4),
    ]);

    const seen = new Set<string>();
    const recent: typeof recentRaw = [];
    for (const r of recentRaw) {
      const key = r.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      recent.push({
        ...r,
        servingDescription:
          cleanServingDescription(r.servingDescription) ?? null,
      });
      if (recent.length >= 8) break;
    }

    // Merge USDA + OFF, USDA first; dedupe by lowercased name.
    const externalSeen = new Set<string>();
    const external: OFFFood[] = [];
    for (const f of [...usda, ...off]) {
      const key = f.name.trim().toLowerCase();
      if (externalSeen.has(key)) continue;
      externalSeen.add(key);
      external.push(f);
    }

    return NextResponse.json({ recent, external });
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
  servings: z.number().positive().max(1000).default(1),
  netCarbsPerServingG: z.number().min(0).max(1000),
  servingDescription: z.string().max(200).optional(),
  servingGrams: z.number().positive().optional(),
  source: z.enum(["search", "barcode", "text", "photo", "manual"]),
  rawInput: z.string().max(2000).optional(),
  barcode: z.string().max(50).optional(),
  eatenAt: z.string().datetime().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const eatenAt = data.eatenAt ? new Date(data.eatenAt) : new Date();
  // Prefer client-supplied localDate (computed in the user's timezone).
  // Server-side fallback is UTC-derived, which is wrong for non-UTC users —
  // it only happens if the client didn't send one (legacy clients).
  const localDate = data.localDate ?? localDateString(eatenAt);
  const totalG = Math.round(data.servings * data.netCarbsPerServingG * 10) / 10;
  const [entry] = await db
    .insert(foodEntries)
    .values({
      name: data.name,
      servings: data.servings.toString(),
      netCarbsPerServingG: data.netCarbsPerServingG.toString(),
      netCarbsG: totalG.toString(),
      servingDescription: data.servingDescription,
      servingGrams: data.servingGrams?.toString(),
      source: data.source,
      rawInput: data.rawInput,
      barcode: data.barcode,
      eatenAt,
      localDate,
    })
    .returning();
  return NextResponse.json({ entry });
}

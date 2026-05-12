import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodEntries } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  // Pull recent entries and dedupe by lowercased name client-side.
  // We over-fetch so the dedupe yields a healthy number of distinct items.
  const recent = await db
    .select({
      name: foodEntries.name,
      netCarbsG: foodEntries.netCarbsG,
      servingDescription: foodEntries.servingDescription,
      source: foodEntries.source,
      eatenAt: foodEntries.eatenAt,
    })
    .from(foodEntries)
    .orderBy(desc(foodEntries.eatenAt))
    .limit(80);

  const seen = new Set<string>();
  const dedup: typeof recent = [];
  for (const r of recent) {
    const key = r.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(r);
    if (dedup.length >= 6) break;
  }

  return NextResponse.json({ recent: dedup });
}

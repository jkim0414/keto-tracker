import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodEntries, settings, weightLogs } from "@/lib/db/schema";
import { eq, gte, sql, desc } from "drizzle-orm";
import { localDateString } from "@/lib/date";

export const runtime = "nodejs";

function isValidDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // Prefer client-supplied "today" (computed in the user's timezone). The
  // server's UTC clock can be hours ahead of the user's local day.
  const queryToday = searchParams.get("date");
  const today = isValidDate(queryToday) ? queryToday : localDateString();

  // 7-day window anchored to client's today.
  const [y, m, d] = today.split("-").map(Number);
  const todayUtc = new Date(Date.UTC(y, m - 1, d));
  todayUtc.setUTCDate(todayUtc.getUTCDate() - 6);
  const sevenDate = `${todayUtc.getUTCFullYear()}-${String(
    todayUtc.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(todayUtc.getUTCDate()).padStart(2, "0")}`;

  const [settingsRow] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  const goal = parseFloat(settingsRow?.dailyNetCarbGoal ?? "20");
  const weightUnit = settingsRow?.weightUnit ?? "lb";

  const todayEntries = await db
    .select()
    .from(foodEntries)
    .where(eq(foodEntries.localDate, today))
    .orderBy(desc(foodEntries.eatenAt));

  const todayNetCarbs = todayEntries.reduce(
    (sum, e) => sum + parseFloat(e.netCarbsG),
    0
  );

  const dailyTotalsRaw = await db
    .select({
      localDate: foodEntries.localDate,
      total: sql<string>`sum(${foodEntries.netCarbsG})`,
    })
    .from(foodEntries)
    .where(gte(foodEntries.localDate, sevenDate))
    .groupBy(foodEntries.localDate)
    .orderBy(foodEntries.localDate);

  const dailyTotals = dailyTotalsRaw.map((r) => ({
    localDate: r.localDate,
    netCarbsG: parseFloat(r.total),
  }));

  const recentWeights = await db
    .select()
    .from(weightLogs)
    .orderBy(desc(weightLogs.loggedAt))
    .limit(30);

  const latestWeight = recentWeights[0];

  return NextResponse.json({
    today,
    goal,
    weightUnit,
    todayNetCarbs,
    todayEntries,
    dailyTotals,
    recentWeights,
    latestWeight: latestWeight ?? null,
  });
}

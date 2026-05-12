import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { foodEntries, settings, weightLogs } from "@/lib/db/schema";
import { eq, gte, sql, desc } from "drizzle-orm";
import { localDateString } from "@/lib/date";

export const runtime = "nodejs";

export async function GET() {
  const today = localDateString();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDate = localDateString(sevenDaysAgo);

  const [settingsRow] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
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

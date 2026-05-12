"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CarbRing from "@/components/CarbRing";
import { kgToLb } from "@/lib/date";
import { bucketColor, carbBucket, KETOSIS_CEILING_G } from "@/lib/keto";

type FoodEntry = {
  id: number;
  eatenAt: string;
  name: string;
  netCarbsG: string;
  servingDescription: string | null;
  source: string;
};

type WeightLog = {
  id: number;
  loggedAt: string;
  localDate: string;
  weightKg: string;
};

type Summary = {
  today: string;
  goal: number;
  weightUnit: "lb" | "kg";
  todayNetCarbs: number;
  todayEntries: FoodEntry[];
  dailyTotals: { localDate: string; netCarbsG: number }[];
  recentWeights: WeightLog[];
  latestWeight: WeightLog | null;
};

export default function Home() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/summary", { cache: "no-store" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function deleteEntry(id: number) {
    const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-20 text-muted text-sm">
        Loading…
      </div>
    );
  }

  const weightDisplay = data.latestWeight
    ? data.weightUnit === "lb"
      ? `${kgToLb(parseFloat(data.latestWeight.weightKg)).toFixed(1)} lb`
      : `${parseFloat(data.latestWeight.weightKg).toFixed(1)} kg`
    : "—";

  const weekMax = Math.max(
    KETOSIS_CEILING_G,
    data.goal,
    ...data.dailyTotals.map((d) => d.netCarbsG)
  );
  const ceilingPct = (KETOSIS_CEILING_G / weekMax) * 100;
  const goalPct = (data.goal / weekMax) * 100;

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center pt-2">
        <CarbRing consumed={data.todayNetCarbs} goal={data.goal} />
        <Link
          href="/log"
          className="mt-5 inline-flex items-center gap-2 bg-accent text-accent-fg font-medium px-5 py-2.5 rounded-full active:scale-95 transition"
        >
          Log food
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/weight"
          className="bg-card border border-border rounded-2xl p-4 active:scale-[0.98] transition"
        >
          <div className="text-xs text-muted uppercase tracking-wide">Weight</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {weightDisplay}
          </div>
          <div className="text-xs text-muted mt-1">
            {data.latestWeight
              ? new Date(data.latestWeight.loggedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "Tap to log"}
          </div>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted uppercase tracking-wide">
            7-day avg
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {data.dailyTotals.length
              ? (
                  data.dailyTotals.reduce((s, d) => s + d.netCarbsG, 0) /
                  data.dailyTotals.length
                ).toFixed(1)
              : "0"}
            <span className="text-sm text-muted font-normal ml-1">g</span>
          </div>
          <div className="text-xs text-muted mt-1">net carbs / day</div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium text-muted">Last 7 days</h2>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ background: "var(--color-accent)" }}
              />
              ≤ goal
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ background: "var(--color-warn)" }}
              />
              ≤ 50g
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ background: "var(--color-danger)" }}
              />
              over
            </span>
          </div>
        </div>
        <div className="relative flex items-end gap-2 h-28">
          <div
            className="absolute left-0 right-0 border-t border-dashed pointer-events-none"
            style={{
              bottom: `${ceilingPct}%`,
              borderColor: "var(--color-danger)",
              opacity: 0.4,
            }}
            title="50g — nutritional ketosis ceiling"
          />
          <div
            className="absolute left-0 right-0 border-t border-dashed pointer-events-none"
            style={{
              bottom: `${goalPct}%`,
              borderColor: "var(--color-accent)",
              opacity: 0.5,
            }}
            title={`${data.goal}g — your daily goal`}
          />
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const found = data.dailyTotals.find((x) => x.localDate === iso);
            const v = found?.netCarbsG ?? 0;
            const h = weekMax > 0 ? (v / weekMax) * 100 : 0;
            const bucket = carbBucket(v, data.goal);
            return (
              <div key={iso} className="flex-1 flex flex-col items-center gap-1 relative z-10">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(h, 4)}%`,
                      background: bucketColor(bucket),
                      opacity: v === 0 ? 0.15 : 1,
                    }}
                    title={`${v.toFixed(1)}g net carbs`}
                  />
                </div>
                <div className="text-[10px] text-muted">
                  {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] text-muted leading-relaxed">
          Green = under your goal. Yellow = over goal but likely still in
          nutritional ketosis (≤50g, per Volek & Phinney). Red = above the
          ketosis ceiling for most adults.
        </p>
      </section>

      <WeightTrend
        weights={data.recentWeights}
        unit={data.weightUnit}
      />

      <section>
        <h2 className="text-sm font-medium text-muted mb-2 px-1">
          Today’s food
        </h2>
        {data.todayEntries.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted text-sm">
            Nothing logged yet today.
          </div>
        ) : (
          <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {data.todayEntries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.name}</div>
                  <div className="text-xs text-muted">
                    {e.servingDescription
                      ? `${e.servingDescription} · `
                      : ""}
                    {new Date(e.eatenAt).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-3">
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">
                      {parseFloat(e.netCarbsG).toFixed(1)}
                      <span className="text-xs text-muted font-normal ml-0.5">
                        g
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(e.id)}
                    className="text-muted hover:text-danger p-1"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function WeightTrend({
  weights,
  unit,
}: {
  weights: WeightLog[];
  unit: "lb" | "kg";
}) {
  if (weights.length === 0) {
    return (
      <section className="bg-card border border-border rounded-2xl p-4">
        <h2 className="text-sm font-medium text-muted mb-2">Weight</h2>
        <Link
          href="/weight"
          className="block py-6 text-center text-sm text-muted hover:text-foreground"
        >
          Tap to log your first weight →
        </Link>
      </section>
    );
  }

  const points = [...weights]
    .reverse()
    .map((w) => ({
      ts: new Date(w.loggedAt).getTime(),
      label: new Date(w.loggedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      weight:
        unit === "lb"
          ? Number(kgToLb(parseFloat(w.weightKg)).toFixed(1))
          : Number(parseFloat(w.weightKg).toFixed(1)),
    }));

  const latest = points[points.length - 1];
  const first = points[0];
  const delta = points.length >= 2 ? latest.weight - first.weight : 0;
  const deltaColor =
    delta < 0 ? "var(--color-accent)" : delta > 0 ? "var(--color-warn)" : "var(--color-muted)";

  return (
    <section className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-medium text-muted">Weight</h2>
        <Link
          href="/weight"
          className="text-xs text-muted hover:text-foreground"
        >
          Log →
        </Link>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold tabular-nums">
          {latest.weight.toFixed(1)}
          <span className="text-sm text-muted font-normal ml-1">{unit}</span>
        </span>
        {points.length >= 2 && (
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: deltaColor }}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} {unit}
            <span className="text-muted font-normal ml-1">
              since {first.label}
            </span>
          </span>
        )}
      </div>
      {points.length >= 2 && (
        <div className="h-24 mt-3 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <XAxis dataKey="label" hide />
              <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(v) => [`${v} ${unit}`, "Weight"]}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { kgToLb, lbToKg, localDateString } from "@/lib/date";

type WeightLog = {
  id: number;
  loggedAt: string;
  localDate: string;
  weightKg: string;
  notes: string | null;
};

type Settings = { weightUnit: "lb" | "kg"; dailyNetCarbGoal: string };

export default function WeightPage() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const [logsRes, settingsRes] = await Promise.all([
      fetch("/api/weight", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
    ]);
    if (logsRes.ok) {
      const data = await logsRes.json();
      setLogs(data.logs);
    }
    if (settingsRes.ok) {
      const data = (await settingsRes.json()) as { settings: Settings };
      setUnit(data.settings.weightUnit);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (!value) return;
    const num = parseFloat(value);
    if (!isFinite(num) || num <= 0) return;
    const weightKg = unit === "lb" ? lbToKg(num) : num;
    setSubmitting(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg, localDate: localDateString() }),
      });
      if (res.ok) {
        setValue("");
        load();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number) {
    const res = await fetch(`/api/weight/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const chartData = [...logs]
    .reverse()
    .map((l) => ({
      date: new Date(l.loggedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      weight:
        unit === "lb"
          ? Number(kgToLb(parseFloat(l.weightKg)).toFixed(1))
          : Number(parseFloat(l.weightKg).toFixed(1)),
    }));

  const latest = logs[0];
  const first = logs[logs.length - 1];
  const change =
    latest && first && latest.id !== first.id
      ? unit === "lb"
        ? kgToLb(parseFloat(latest.weightKg)) - kgToLb(parseFloat(first.weightKg))
        : parseFloat(latest.weightKg) - parseFloat(first.weightKg)
      : 0;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Weight</h1>

      <div className="bg-card border border-border rounded-2xl p-4">
        <label className="text-xs uppercase tracking-wide text-muted">
          Today’s weight
        </label>
        <div className="flex items-end gap-3 mt-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-4xl font-semibold tabular-nums focus:outline-none border-b border-border pb-1"
          />
          <span className="text-xl text-muted pb-2">{unit}</span>
        </div>
        <button
          onClick={submit}
          disabled={submitting || !value}
          className="w-full mt-4 bg-accent text-accent-fg font-medium py-3 rounded-xl active:scale-[0.98] transition disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Log weight"}
        </button>
      </div>

      {loaded && logs.length >= 2 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-medium text-muted">Trend</h2>
            <span
              className={`text-sm font-semibold tabular-nums ${
                change < 0
                  ? "text-accent"
                  : change > 0
                    ? "text-warn"
                    : "text-muted"
              }`}
            >
              {change > 0 ? "+" : ""}
              {change.toFixed(1)} {unit}
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-muted)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--color-muted)"
                  fontSize={11}
                  tickLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted mb-2 px-1">History</h2>
        {logs.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted text-sm">
            No weights logged yet.
          </div>
        ) : (
          <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <div className="font-medium tabular-nums">
                    {unit === "lb"
                      ? kgToLb(parseFloat(l.weightKg)).toFixed(1)
                      : parseFloat(l.weightKg).toFixed(1)}
                    <span className="text-sm text-muted font-normal ml-1">
                      {unit}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(l.loggedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <button
                  onClick={() => remove(l.id)}
                  className="text-muted hover:text-danger p-1"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

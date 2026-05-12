"use client";

import { useEffect, useState } from "react";

type Settings = {
  dailyNetCarbGoal: string;
  weightUnit: "lb" | "kg";
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [goal, setGoal] = useState("");
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { settings: Settings }) => {
        setS(data.settings);
        setGoal(data.settings.dailyNetCarbGoal);
        setUnit(data.settings.weightUnit);
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyNetCarbGoal: parseFloat(goal) || 20,
          weightUnit: unit,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { settings: Settings };
        setS(data.settings);
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  }

  if (!s) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        <div className="p-4">
          <label className="text-sm font-medium">Daily net carb goal</label>
          <div className="text-xs text-muted mt-0.5 mb-2">
            Strict keto is typically 20g/day. Moderate is up to 50g.
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="1"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent tabular-nums"
            />
            <span className="text-muted">g</span>
          </div>
        </div>

        <div className="p-4">
          <label className="text-sm font-medium">Weight unit</label>
          <div className="flex gap-2 mt-2">
            {(["lb", "kg"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                  unit === u
                    ? "bg-accent text-accent-fg border-accent"
                    : "border-border text-muted"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-accent text-accent-fg font-medium py-3 rounded-xl disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {savedAt && (
        <p className="text-xs text-accent text-center">Saved.</p>
      )}

      <div className="text-xs text-muted text-center pt-4">
        Keto Tracker · data lives in your Neon database.
      </div>
    </div>
  );
}

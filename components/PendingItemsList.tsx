"use client";

import { Check, Minus, Plus, Trash2 } from "lucide-react";

export type PendingItem = {
  name: string;
  servings: number;
  netCarbsPerServingG: number;
  servingDescription?: string;
  source: "search" | "barcode" | "text" | "photo" | "manual" | "recent";
  rawInput?: string;
  barcode?: string;
  servingGrams?: number;
  confidence?: "high" | "medium" | "low";
  notes?: string;
};

export function itemTotalCarbs(item: PendingItem): number {
  return (item.servings || 0) * (item.netCarbsPerServingG || 0);
}

type Props = {
  items: PendingItem[];
  onChange: (i: number, item: PendingItem) => void;
  onRemove: (i: number) => void;
  onSubmit: () => void;
  submitting: boolean;
};

export default function PendingItemsList({
  items,
  onChange,
  onRemove,
  onSubmit,
  submitting,
}: Props) {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + itemTotalCarbs(i), 0);

  function setServings(i: number, item: PendingItem, next: number) {
    onChange(i, { ...item, servings: Math.max(0, Math.round(next * 100) / 100) });
  }

  function setTotalCarbs(i: number, item: PendingItem, totalG: number) {
    const s = item.servings || 1;
    onChange(i, {
      ...item,
      netCarbsPerServingG: Math.max(0, totalG / s),
    });
  }

  return (
    <div className="mt-4 bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{total.toFixed(1)}g</span>
          <span className="text-muted"> net carbs</span>
        </span>
      </div>
      {items.map((item, i) => {
        const totalCarbs = itemTotalCarbs(item);
        return (
          <div key={i} className="px-4 py-3 space-y-2">
            <div className="flex items-start gap-2">
              <input
                value={item.name}
                onChange={(e) => onChange(i, { ...item, name: e.target.value })}
                className="flex-1 bg-transparent font-medium focus:outline-none border-b border-transparent focus:border-border pb-1"
              />
              <button
                onClick={() => onRemove(i)}
                className="text-muted hover:text-danger p-1"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-background border border-border rounded-lg">
                <button
                  onClick={() =>
                    setServings(i, item, (item.servings || 1) - 0.5)
                  }
                  className="px-2 py-1 text-muted active:bg-border/40"
                  aria-label="Decrease servings"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  value={item.servings}
                  onChange={(e) =>
                    setServings(i, item, parseFloat(e.target.value) || 0)
                  }
                  className="w-12 text-center bg-transparent tabular-nums text-sm focus:outline-none py-1"
                />
                <button
                  onClick={() =>
                    setServings(i, item, (item.servings || 1) + 0.5)
                  }
                  className="px-2 py-1 text-muted active:bg-border/40"
                  aria-label="Increase servings"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-sm text-muted">×</span>
              <input
                value={item.servingDescription ?? ""}
                onChange={(e) =>
                  onChange(i, { ...item, servingDescription: e.target.value })
                }
                placeholder="serving"
                className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-border pb-1"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted">Net carbs</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={Number.isFinite(totalCarbs) ? totalCarbs.toFixed(1) : "0"}
                  onChange={(e) =>
                    setTotalCarbs(i, item, parseFloat(e.target.value) || 0)
                  }
                  className="w-20 text-right bg-transparent tabular-nums font-semibold focus:outline-none border-b border-border pb-0.5"
                />
                <span className="text-sm text-muted">g</span>
              </div>
            </div>

            {item.confidence && item.confidence !== "high" && (
              <div className="text-[11px] text-warn">
                {item.confidence} confidence
                {item.notes ? ` — ${item.notes}` : ""}
              </div>
            )}
          </div>
        );
      })}
      <div className="p-3">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full bg-accent text-accent-fg font-medium py-3 rounded-xl active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Check size={18} />
          {submitting ? "Saving…" : "Log all"}
        </button>
      </div>
    </div>
  );
}

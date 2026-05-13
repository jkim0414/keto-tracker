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
    onChange(i, {
      ...item,
      servings: Math.max(0, Math.round(next * 100) / 100),
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
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium min-w-0 truncate">{item.name}</div>
              <button
                onClick={() => onRemove(i)}
                className="text-muted hover:text-danger p-1 shrink-0"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <ServingsStepper
                value={item.servings}
                onChange={(v) => setServings(i, item, v)}
              />
              <span className="text-sm text-muted">×</span>
              <span className="text-sm text-muted min-w-0 truncate flex-1">
                {item.servingDescription || "serving"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted">Net carbs</span>
              <span className="text-sm font-semibold tabular-nums">
                {totalCarbs.toFixed(1)}
                <span className="text-xs text-muted font-normal ml-0.5">g</span>
              </span>
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

export function ServingsStepper({
  value,
  onChange,
  step = 0.5,
  min = 0.25,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="px-2.5 py-1.5 text-muted active:bg-border/40"
        aria-label="Decrease servings"
      >
        <Minus size={14} />
      </button>
      <div className="w-12 text-center tabular-nums text-sm py-1.5">
        {Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}
      </div>
      <button
        onClick={() => onChange(value + step)}
        className="px-2.5 py-1.5 text-muted active:bg-border/40"
        aria-label="Increase servings"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

"use client";

import { Check, Trash2 } from "lucide-react";

export type PendingItem = {
  name: string;
  netCarbsG: number;
  servingDescription?: string;
  source: "search" | "barcode" | "text" | "photo" | "manual";
  rawInput?: string;
  barcode?: string;
  servingGrams?: number;
  confidence?: "high" | "medium" | "low";
  notes?: string;
};

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
  const total = items.reduce((s, i) => s + (Number(i.netCarbsG) || 0), 0);

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
      {items.map((item, i) => (
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
          <div className="flex items-center gap-3">
            <input
              value={item.servingDescription ?? ""}
              onChange={(e) =>
                onChange(i, { ...item, servingDescription: e.target.value })
              }
              placeholder="serving (optional)"
              className="flex-1 bg-transparent text-sm text-muted focus:outline-none border-b border-transparent focus:border-border pb-1"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={item.netCarbsG}
                onChange={(e) =>
                  onChange(i, {
                    ...item,
                    netCarbsG: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-16 text-right bg-transparent tabular-nums font-semibold focus:outline-none border-b border-border pb-1"
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
      ))}
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

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ScanLine,
  Camera,
  Sparkles,
  Loader2,
  Plus,
} from "lucide-react";
import PendingItemsList, { PendingItem } from "@/components/PendingItemsList";
import BarcodeScanner from "@/components/BarcodeScanner";

type OFFFood = {
  name: string;
  brand?: string;
  barcode?: string;
  netCarbsPer100g: number;
  servingGrams?: number;
  servingDescription?: string;
  imageUrl?: string;
};

type Tab = "search" | "scan" | "photo" | "text";

const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
  { id: "search", label: "Search", icon: Search },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "photo", label: "Photo", icon: Camera },
  { id: "text", label: "Describe", icon: Sparkles },
];

export default function LogPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("search");
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addItem(item: PendingItem) {
    setPending((p) => [...p, item]);
  }
  function addItems(items: PendingItem[]) {
    setPending((p) => [...p, ...items]);
  }
  function updateItem(i: number, item: PendingItem) {
    setPending((p) => p.map((x, idx) => (idx === i ? item : x)));
  }
  function removeItem(i: number) {
    setPending((p) => p.filter((_, idx) => idx !== i));
  }

  async function submitAll() {
    if (pending.length === 0) return;
    setSubmitting(true);
    try {
      for (const item of pending) {
        await fetch("/api/foods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-3">Log food</h1>

      <div className="grid grid-cols-4 gap-1 p-1 bg-card border border-border rounded-2xl mb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition ${
                active
                  ? "bg-accent text-accent-fg"
                  : "text-muted active:bg-border/50"
              }`}
            >
              <Icon size={20} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "search" && <SearchTab onAdd={addItem} />}
      {tab === "scan" && <ScanTab onAdd={addItem} />}
      {tab === "photo" && <PhotoTab onAdd={addItems} />}
      {tab === "text" && <TextTab onAdd={addItems} />}

      <PendingItemsList
        items={pending}
        onChange={updateItem}
        onRemove={removeItem}
        onSubmit={submitAll}
        submitting={submitting}
      />
    </div>
  );
}

function foodToPending(
  food: OFFFood,
  source: "search" | "barcode",
  servings: number
): PendingItem {
  const grams = food.servingGrams ?? 100;
  const netCarbs = (food.netCarbsPer100g * grams * servings) / 100;
  const servingDesc = food.servingDescription
    ? `${servings} × ${food.servingDescription}`
    : `${(grams * servings).toFixed(0)}g`;
  return {
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    netCarbsG: Math.max(0, Math.round(netCarbs * 10) / 10),
    servingDescription: servingDesc,
    source,
    barcode: food.barcode,
    servingGrams: grams * servings,
  };
}

function SearchTab({ onAdd }: { onAdd: (item: PendingItem) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OFFFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OFFFood | null>(null);
  const [servings, setServings] = useState(1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/foods?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (selected) {
    const grams = selected.servingGrams ?? 100;
    const netCarbs = (selected.netCarbsPer100g * grams * servings) / 100;
    return (
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div>
          <div className="font-medium">{selected.name}</div>
          {selected.brand && (
            <div className="text-sm text-muted">{selected.brand}</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted">Servings</label>
          <div className="flex items-center bg-background border border-border rounded-lg">
            <button
              onClick={() => setServings((s) => Math.max(0.25, s - 0.5))}
              className="px-3 py-1.5 text-lg"
            >
              −
            </button>
            <input
              type="number"
              step="0.25"
              value={servings}
              onChange={(e) =>
                setServings(Math.max(0.25, parseFloat(e.target.value) || 0))
              }
              className="w-14 text-center bg-transparent tabular-nums focus:outline-none"
            />
            <button
              onClick={() => setServings((s) => s + 0.5)}
              className="px-3 py-1.5 text-lg"
            >
              +
            </button>
          </div>
          <span className="text-sm text-muted">
            × {selected.servingDescription ?? `${grams}g`}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-muted">Net carbs</div>
            <div className="text-2xl font-semibold tabular-nums">
              {netCarbs.toFixed(1)}
              <span className="text-sm text-muted font-normal ml-1">g</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-2 rounded-lg border border-border text-sm"
            >
              Back
            </button>
            <button
              onClick={() => {
                onAdd(foodToPending(selected, "search", servings));
                setSelected(null);
                setQuery("");
                setResults([]);
                setServings(1);
              }}
              className="px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods or brands…"
          className="w-full bg-card border border-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-accent"
        />
        {loading && (
          <Loader2
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted spin"
          />
        )}
      </div>

      <ManualEntry onAdd={onAdd} />

      {results.length > 0 && (
        <ul className="mt-3 bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {results.map((r, i) => (
            <li key={`${r.barcode ?? i}`}>
              <button
                onClick={() => setSelected(r)}
                className="w-full px-4 py-3 text-left active:bg-border/40 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted truncate">
                    {r.brand ? `${r.brand} · ` : ""}
                    {r.netCarbsPer100g.toFixed(1)}g net carbs / 100g
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ManualEntry({ onAdd }: { onAdd: (item: PendingItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [carbs, setCarbs] = useState("");
  const [serving, setServing] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full text-sm text-muted hover:text-foreground py-2 flex items-center justify-center gap-1"
      >
        <Plus size={14} /> Add manually
      </button>
    );
  }
  return (
    <div className="mt-3 bg-card border border-border rounded-2xl p-4 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Food name"
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
      />
      <input
        value={serving}
        onChange={(e) => setServing(e.target.value)}
        placeholder="Serving (optional, e.g. '1 cup')"
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          placeholder="Net carbs"
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
        />
        <span className="text-muted">g</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setName("");
            setCarbs("");
            setServing("");
          }}
          className="flex-1 px-4 py-2 rounded-lg border border-border text-sm"
        >
          Cancel
        </button>
        <button
          disabled={!name.trim() || !carbs}
          onClick={() => {
            onAdd({
              name: name.trim(),
              netCarbsG: parseFloat(carbs) || 0,
              servingDescription: serving.trim() || undefined,
              source: "manual",
            });
            setOpen(false);
            setName("");
            setCarbs("");
            setServing("");
          }}
          className="flex-1 px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ScanTab({ onAdd }: { onAdd: (item: PendingItem) => void }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCode(code: string) {
    setScanning(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/foods/barcode/${code}`);
      if (res.status === 404) {
        setError(
          `No product found for barcode ${code}. Try searching or adding manually.`
        );
        return;
      }
      if (!res.ok) {
        setError("Lookup failed");
        return;
      }
      const data = await res.json();
      onAdd(foodToPending(data.product, "barcode", 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center">
      <ScanLine size={36} className="mx-auto mb-3 text-muted" />
      <p className="text-sm text-muted mb-4">
        Scan a packaged-food barcode to look up net carbs.
      </p>
      <button
        onClick={() => setScanning(true)}
        disabled={loading}
        className="bg-accent text-accent-fg font-medium px-5 py-2.5 rounded-full active:scale-95 transition disabled:opacity-60"
      >
        {loading ? "Looking up…" : "Open scanner"}
      </button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {scanning && (
        <BarcodeScanner
          onDetected={handleCode}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}

function PhotoTab({ onAdd }: { onAdd: (items: PendingItem[]) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      if (caption.trim()) form.append("caption", caption.trim());
      const res = await fetch("/api/foods/parse-image", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed (${res.status})`);
        return;
      }
      const data = await res.json();
      const items: PendingItem[] = (data.items || []).map(
        (it: {
          name: string;
          netCarbsG: number;
          servingDescription?: string;
          confidence: "high" | "medium" | "low";
          notes?: string;
        }) => ({
          name: it.name,
          netCarbsG: it.netCarbsG,
          servingDescription: it.servingDescription,
          source: "photo",
          confidence: it.confidence,
          notes: it.notes,
        })
      );
      if (items.length === 0) {
        setError("No food detected. Try a clearer photo or use Describe.");
      } else {
        onAdd(items);
        setCaption("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <p className="text-sm text-muted">
        Snap a photo of your plate or a label. AI will estimate net carbs —
        review before logging.
      </p>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Optional: add details (e.g. 'small portion')"
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent text-sm"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="w-full bg-accent text-accent-fg font-medium py-3 rounded-xl active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="spin" /> Analyzing…
          </>
        ) : (
          <>
            <Camera size={18} /> Take or choose photo
          </>
        )}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function TextTab({ onAdd }: { onAdd: (items: PendingItem[]) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/foods/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed (${res.status})`);
        return;
      }
      const data = await res.json();
      const items: PendingItem[] = (data.items || []).map(
        (it: {
          name: string;
          netCarbsG: number;
          servingDescription?: string;
          confidence: "high" | "medium" | "low";
          notes?: string;
        }) => ({
          name: it.name,
          netCarbsG: it.netCarbsG,
          servingDescription: it.servingDescription,
          source: "text",
          rawInput: text,
          confidence: it.confidence,
          notes: it.notes,
        })
      );
      if (items.length === 0) {
        setError("Couldn't parse that. Try being more specific.");
      } else {
        onAdd(items);
        setText("");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <p className="text-sm text-muted">
        Describe what you ate in plain English. AI will break it into items.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. 'three eggs scrambled with a tablespoon of butter and half an avocado'"
        rows={4}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent resize-none"
      />
      <button
        onClick={submit}
        disabled={loading || !text.trim()}
        className="w-full bg-accent text-accent-fg font-medium py-3 rounded-xl active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="spin" /> Parsing…
          </>
        ) : (
          <>
            <Sparkles size={18} /> Parse
          </>
        )}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

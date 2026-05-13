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
  Clock,
} from "lucide-react";
import PendingItemsList, {
  PendingItem,
  itemTotalCarbs,
} from "@/components/PendingItemsList";
import BarcodeScanner from "@/components/BarcodeScanner";
import { cleanServingDescription } from "@/lib/serving";
import { localDateString } from "@/lib/date";

type OFFFood = {
  name: string;
  brand?: string;
  barcode?: string;
  netCarbsPer100g: number;
  servingGrams?: number;
  servingDescription?: string;
  imageUrl?: string;
};

type RecentEntry = {
  name: string;
  netCarbsG: string;
  servingDescription: string | null;
  source: string;
};

type Tab = "search" | "scan" | "photo" | "text";

const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
  { id: "search", label: "Search", icon: Search },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "photo", label: "Photo", icon: Camera },
  { id: "text", label: "Describe", icon: Sparkles },
];

function offToPending(
  food: OFFFood,
  source: "search" | "barcode"
): PendingItem {
  const grams = food.servingGrams ?? 100;
  const perServing = (food.netCarbsPer100g * grams) / 100;
  const servingDesc =
    food.servingDescription ||
    (food.servingGrams ? `${grams}g` : "100g");
  return {
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    servings: 1,
    netCarbsPerServingG: Math.max(0, Math.round(perServing * 100) / 100),
    servingDescription: servingDesc,
    source,
    barcode: food.barcode,
    servingGrams: grams,
  };
}

export default function LogPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("search");
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  useEffect(() => {
    fetch("/api/foods/recent")
      .then((r) => (r.ok ? r.json() : { recent: [] }))
      .then((d: { recent: RecentEntry[] }) => setRecents(d.recent || []));
  }, []);

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

  function addFromRecent(r: RecentEntry) {
    const carbs = parseFloat(r.netCarbsG) || 0;
    addItem({
      name: r.name,
      servings: 1,
      netCarbsPerServingG: carbs,
      servingDescription: cleanServingDescription(r.servingDescription),
      source: "recent",
    });
  }

  async function submitAll() {
    if (pending.length === 0) return;
    setSubmitting(true);
    try {
      const localDate = localDateString();
      for (const item of pending) {
        const total = itemTotalCarbs(item);
        const desc =
          item.servings && item.servings !== 1 && item.servingDescription
            ? `${item.servings} × ${item.servingDescription}`
            : item.servingDescription;
        await fetch("/api/foods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            netCarbsG: Math.round(total * 10) / 10,
            servingDescription: desc,
            servingGrams: item.servingGrams
              ? item.servingGrams * (item.servings || 1)
              : undefined,
            source: item.source === "recent" ? "search" : item.source,
            rawInput: item.rawInput,
            barcode: item.barcode,
            localDate,
          }),
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

      {recents.length > 0 && (
        <RecentsList items={recents} onAdd={addFromRecent} />
      )}

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

function RecentsList({
  items,
  onAdd,
}: {
  items: RecentEntry[];
  onAdd: (r: RecentEntry) => void;
}) {
  return (
    <section className="mb-4 -mx-4">
      <div className="flex items-center gap-1.5 mb-2 px-5 text-xs text-muted uppercase tracking-wide">
        <Clock size={12} />
        Recent
      </div>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "thin" }}
      >
        {items.map((r, i) => (
          <button
            key={`${r.name}-${i}`}
            onClick={() => onAdd(r)}
            className="snap-start shrink-0 w-36 bg-card border border-border rounded-xl px-3 py-2.5 text-left active:bg-border/40 transition flex flex-col justify-between gap-2"
          >
            <div className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
              {r.name}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-muted">
                {parseFloat(r.netCarbsG).toFixed(1)}g
              </span>
              <span className="w-6 h-6 rounded-full bg-accent text-accent-fg flex items-center justify-center shrink-0">
                <Plus size={12} strokeWidth={2.5} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function SearchTab({ onAdd }: { onAdd: (item: PendingItem) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OFFFood[]>([]);
  const [loading, setLoading] = useState(false);
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
        const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}`);
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
                onClick={() => {
                  onAdd(offToPending(r, "search"));
                  setQuery("");
                  setResults([]);
                }}
                className="w-full px-4 py-3 text-left active:bg-border/40 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted truncate">
                    {r.brand ? `${r.brand} · ` : ""}
                    {r.netCarbsPer100g.toFixed(1)}g net carbs / 100g
                    {r.servingDescription
                      ? ` · ${r.servingDescription}`
                      : ""}
                  </div>
                </div>
                <span className="w-7 h-7 rounded-full bg-accent text-accent-fg flex items-center justify-center shrink-0">
                  <Plus size={14} strokeWidth={2.5} />
                </span>
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
  const [serving, setServing] = useState("");
  const [mode, setMode] = useState<"direct" | "label">("direct");
  const [netCarbsInput, setNetCarbsInput] = useState("");
  const [totalCarbs, setTotalCarbs] = useState("");
  const [fiber, setFiber] = useState("");
  const [sugarAlcohols, setSugarAlcohols] = useState("");
  const [allulose, setAllulose] = useState("");

  function reset() {
    setOpen(false);
    setName("");
    setServing("");
    setMode("direct");
    setNetCarbsInput("");
    setTotalCarbs("");
    setFiber("");
    setSugarAlcohols("");
    setAllulose("");
  }

  const computedNet =
    mode === "label"
      ? Math.max(
          0,
          (parseFloat(totalCarbs) || 0) -
            (parseFloat(fiber) || 0) -
            (parseFloat(sugarAlcohols) || 0) -
            (parseFloat(allulose) || 0)
        )
      : parseFloat(netCarbsInput) || 0;

  const canSubmit =
    name.trim().length > 0 &&
    (mode === "direct" ? netCarbsInput !== "" : totalCarbs !== "");

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
        placeholder="Serving (e.g. '1 cup')"
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
      />

      <div className="flex gap-1 p-1 bg-background border border-border rounded-lg">
        <button
          onClick={() => setMode("direct")}
          className={`flex-1 py-1.5 rounded text-xs font-medium ${
            mode === "direct" ? "bg-accent text-accent-fg" : "text-muted"
          }`}
        >
          Net carbs
        </button>
        <button
          onClick={() => setMode("label")}
          className={`flex-1 py-1.5 rounded text-xs font-medium ${
            mode === "label" ? "bg-accent text-accent-fg" : "text-muted"
          }`}
        >
          From label
        </button>
      </div>

      {mode === "direct" ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={netCarbsInput}
            onChange={(e) => setNetCarbsInput(e.target.value)}
            placeholder="Net carbs per serving"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
          />
          <span className="text-muted">g</span>
        </div>
      ) : (
        <div className="space-y-2">
          <LabelField
            label="Total carbs"
            value={totalCarbs}
            onChange={setTotalCarbs}
          />
          <LabelField label="Fiber" value={fiber} onChange={setFiber} />
          <LabelField
            label="Sugar alcohols"
            hint="erythritol, xylitol, etc."
            value={sugarAlcohols}
            onChange={setSugarAlcohols}
          />
          <LabelField
            label="Allulose"
            hint="not always grouped under sugar alcohols"
            value={allulose}
            onChange={setAllulose}
          />
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-muted">Net carbs per serving</span>
            <span className="font-semibold tabular-nums">
              {computedNet.toFixed(1)}
              <span className="text-muted font-normal ml-1">g</span>
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={reset}
          className="flex-1 px-4 py-2 rounded-lg border border-border text-sm"
        >
          Cancel
        </button>
        <button
          disabled={!canSubmit}
          onClick={() => {
            onAdd({
              name: name.trim(),
              servings: 1,
              netCarbsPerServingG: Math.round(computedNet * 10) / 10,
              servingDescription: serving.trim() || undefined,
              source: "manual",
            });
            reset();
          }}
          className="flex-1 px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function LabelField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[10px] text-muted">{hint}</div>}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-20 text-right bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent tabular-nums"
        />
        <span className="text-xs text-muted">g</span>
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
      onAdd(offToPending(data.product, "barcode"));
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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickFile(f: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    setError(null);
  }

  async function analyze() {
    if (!file) return;
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
          servings: 1,
          netCarbsPerServingG: it.netCarbsG,
          servingDescription: cleanServingDescription(it.servingDescription),
          source: "photo",
          confidence: it.confidence,
          notes: it.notes,
        })
      );
      if (items.length === 0) {
        setError("No food detected. Try a clearer photo or use Describe.");
      } else {
        onAdd(items);
        reset();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
          e.target.value = "";
        }}
      />

      {!file ? (
        <>
          <p className="text-sm text-muted">
            Snap a photo of your plate or a label. After selecting, you can
            add details before analyzing.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full bg-accent text-accent-fg font-medium py-3 rounded-xl active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Camera size={18} /> Take or choose photo
          </button>
        </>
      ) : (
        <>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected food"
              className="w-full max-h-72 object-cover rounded-xl border border-border"
            />
          )}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional: add details (e.g. 'small portion', 'no rice', 'cooked in butter')"
            rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium disabled:opacity-60"
            >
              Retake
            </button>
            <button
              onClick={reset}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={analyze}
              disabled={loading}
              className="flex-1 bg-accent text-accent-fg font-medium py-2.5 rounded-xl active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Analyze
                </>
              )}
            </button>
          </div>
        </>
      )}
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
          servings: 1,
          netCarbsPerServingG: it.netCarbsG,
          servingDescription: cleanServingDescription(it.servingDescription),
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

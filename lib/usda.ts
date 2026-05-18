import type { OFFFood } from "./openfoodfacts";

// USDA FoodData Central is the gold-standard nutrition database for generic
// US foods ("mango", "biscuit", "chicken breast"). Free, unlimited with a
// signup key. DEMO_KEY works for casual use but is rate-limited (~30/hour).
// Get a free key at https://fdc.nal.usda.gov/api-key-signup.html
const API_KEY = process.env.USDA_FDC_API_KEY || "DEMO_KEY";

// Data types we query, ordered by quality:
//  - Foundation: USDA's recently re-analyzed, highest-quality entries (~200)
//  - SR Legacy:  USDA's classic Standard Reference DB (~7k whole foods)
//  - Survey:     FNDDS — prepared dishes (e.g. "Chicken, fried", "Pasta")
//  - Branded:    branded product database (~600k items, noisy but covers
//                packaged items USDA's whole-food sets don't)
//
// USDA's API gets flaky when you combine all four in a single query (random
// HTTP 400s). Splitting into two parallel queries avoids that and gives us
// better control over ranking.
const WHOLE_FOOD_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];
const BRANDED_TYPE = ["Branded"];

type USDANutrient = {
  nutrientId: number;
  nutrientName?: string;
  value?: number;
  unitName?: string;
};

type USDAFood = {
  fdcId: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  dataType?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: USDANutrient[];
};

// USDA nutrient IDs:
//   1005 = Carbohydrate, by difference (g)
//   1079 = Fiber, total dietary (g)
//   1086 = Total Sugar Alcohols (g) — rarely populated, but try
function nutrientById(food: USDAFood, id: number): number {
  const n = food.foodNutrients?.find((x) => x.nutrientId === id);
  return typeof n?.value === "number" ? n.value : 0;
}

function toOFFFood(f: USDAFood): OFFFood | null {
  if (!f.description) return null;
  const carbs = nutrientById(f, 1005);
  if (!isFinite(carbs) || carbs < 0) return null;
  const fiber = nutrientById(f, 1079);
  const polyols = nutrientById(f, 1086);
  const net = Math.max(0, carbs - fiber - polyols);

  // USDA whole foods are reported per 100g. Some entries also include a
  // household serving (e.g. "1 cup, sliced" → 165g) which we expose as the
  // serving description.
  const servingGrams = f.servingSize || undefined;
  const servingDescription =
    f.householdServingFullText ||
    (servingGrams && f.servingSizeUnit
      ? `1 ${f.servingSizeUnit}`
      : undefined);

  return {
    name: f.description,
    brand: f.brandOwner || f.brandName || undefined,
    barcode: undefined,
    netCarbsPer100g: net,
    carbsPer100g: carbs,
    fiberPer100g: fiber,
    polyolsPer100g: polyols,
    servingGrams: servingGrams && isFinite(servingGrams) ? servingGrams : undefined,
    servingDescription,
    imageUrl: undefined,
  };
}

async function queryUSDA(
  query: string,
  pageSize: number,
  dataTypes: string[]
): Promise<USDAFood[]> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", String(pageSize));
  // IMPORTANT: USDA's API rejects comma-separated dataType values with a 404.
  // It expects multiple ?dataType= params instead.
  for (const dt of dataTypes) {
    url.searchParams.append("dataType", dt);
  }

  // Up to two retries on transient 4xx/5xx — USDA's load balancer is flaky.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = (await res.json()) as { foods?: USDAFood[] };
        return data.foods || [];
      }
    } catch {
      // network / timeout — fall through to retry
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 200));
  }
  return [];
}

function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function matchScore(food: OFFFood, words: string[]): number {
  if (words.length === 0) return 0;
  const haystack = `${food.name} ${food.brand ?? ""}`.toLowerCase();
  return words.reduce((s, w) => s + (haystack.includes(w) ? 1 : 0), 0);
}

/**
 * Look up a product by GTIN/UPC barcode against USDA's Branded dataset.
 * USDA exposes gtinUpc as a searchable field, so querying the barcode
 * digits with dataType=Branded returns an exact match when available.
 */
export async function lookupBarcodeUSDA(
  barcode: string
): Promise<OFFFood | null> {
  if (!/^\d{6,14}$/.test(barcode)) return null;
  const foods = await queryUSDA(barcode, 3, BRANDED_TYPE);
  // Require an exact GTIN match (substring or equality on either end of the
  // raw gtinUpc field — some entries store as "00012345678905" with leading
  // zeros, some without).
  const hit = foods.find((f) => {
    const g = (f.gtinUpc || "").replace(/^0+/, "");
    const b = barcode.replace(/^0+/, "");
    return g && (g === b || g.endsWith(b) || b.endsWith(g));
  });
  return hit ? toOFFFood(hit) : null;
}

export async function searchFoodsUSDA(
  query: string,
  limit = 10
): Promise<OFFFood[]> {
  if (!query.trim()) return [];

  const wholeBudget = Math.max(limit - 2, 4);
  const brandedBudget = Math.max(Math.floor(limit / 2), 3);

  const [whole, branded] = await Promise.all([
    queryUSDA(query, wholeBudget, WHOLE_FOOD_TYPES),
    queryUSDA(query, brandedBudget, BRANDED_TYPE),
  ]);

  const adapt = (foods: USDAFood[]) =>
    foods.map(toOFFFood).filter((x): x is OFFFood => x !== null);

  const words = queryWords(query);

  // Score each result and rank ACROSS both datasets. Whole foods get a small
  // tiebreaker boost (so generic "Blueberries, raw" beats a branded version
  // when both fully match), but a fully-matching branded entry beats a
  // partial-match whole-food entry. This is what fixes searches like
  // "kirkland signature pistachios": the Branded entry matches all 3 words
  // and outranks generic "Pistachio nuts" (1/3 words).
  type Scored = { food: OFFFood; matchScore: number; tier: number };
  const scored: Scored[] = [
    ...adapt(whole).map((f) => ({ food: f, matchScore: matchScore(f, words), tier: 0 })),
    ...adapt(branded).map((f) => ({ food: f, matchScore: matchScore(f, words), tier: 1 })),
  ];
  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.tier - b.tier;
  });

  const seen = new Set<string>();
  const merged: OFFFood[] = [];
  for (const { food } of scored) {
    const key = `${food.name.toLowerCase()}|${food.brand?.toLowerCase() ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(food);
    if (merged.length >= limit) break;
  }
  return merged;
}

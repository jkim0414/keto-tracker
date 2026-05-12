export type OFFFood = {
  name: string;
  brand?: string;
  barcode?: string;
  netCarbsPer100g: number;
  carbsPer100g: number;
  fiberPer100g: number;
  polyolsPer100g: number;
  servingGrams?: number;
  servingDescription?: string;
  imageUrl?: string;
};

type OFFProduct = {
  product_name?: string;
  brands?: string;
  code?: string;
  serving_size?: string;
  serving_quantity?: string | number;
  image_front_small_url?: string;
  nutriments?: {
    carbohydrates_100g?: number;
    fiber_100g?: number;
    polyols_100g?: number;
    erythritol_100g?: number;
  };
};

function cleanServingDescription(s: string | undefined): string | undefined {
  if (!s) return s;
  const trimmed = s.trim();
  // OFF often prefixes descriptions with "1 " (e.g. "1 Slice (30 g)", "1 cup")
  // because their model assumes a single-serving display. We have an explicit
  // servings stepper, so "1 × 1 Slice" is redundant. Strip the leading "1 ".
  // Don't strip if it's "1.5" or "10" — only the literal leading single digit 1.
  return trimmed.replace(/^1\s+(?=\D)/, "");
}

function toFood(p: OFFProduct): OFFFood | null {
  const carbs = Number(p.nutriments?.carbohydrates_100g);
  if (!isFinite(carbs)) return null;
  const fiber = Number(p.nutriments?.fiber_100g) || 0;
  // Sugar alcohols (polyols) and erythritol aren't metabolized like sugar.
  // OFF reports them under `polyols_100g`. Some products break out erythritol separately.
  const polyols = Math.max(
    Number(p.nutriments?.polyols_100g) || 0,
    Number(p.nutriments?.erythritol_100g) || 0
  );
  const net = Math.max(0, carbs - fiber - polyols);
  const servingGrams =
    typeof p.serving_quantity === "number"
      ? p.serving_quantity
      : p.serving_quantity
        ? parseFloat(String(p.serving_quantity))
        : undefined;
  return {
    name: p.product_name?.trim() || "Unknown",
    brand: p.brands?.split(",")[0]?.trim() || undefined,
    barcode: p.code,
    netCarbsPer100g: net,
    carbsPer100g: carbs,
    fiberPer100g: fiber,
    polyolsPer100g: polyols,
    servingGrams: servingGrams && isFinite(servingGrams) ? servingGrams : undefined,
    servingDescription: cleanServingDescription(p.serving_size),
    imageUrl: p.image_front_small_url,
  };
}

export async function searchFoods(query: string, limit = 12): Promise<OFFFood[]> {
  if (!query.trim()) return [];
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(limit));
  url.searchParams.set(
    "fields",
    "product_name,brands,code,serving_size,serving_quantity,image_front_small_url,nutriments"
  );

  const res = await fetch(url, {
    headers: { "User-Agent": "keto-tracker/0.1 (personal)" },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { products?: OFFProduct[] };
  const products = data.products || [];
  return products.map(toFood).filter((x): x is OFFFood => x !== null);
}

export async function lookupBarcode(barcode: string): Promise<OFFFood | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    {
      headers: { "User-Agent": "keto-tracker/0.1 (personal)" },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { product?: OFFProduct; status?: number };
  if (!data.product || data.status === 0) return null;
  return toFood(data.product);
}

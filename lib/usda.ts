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
const DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"];

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

export async function searchFoodsUSDA(
  query: string,
  limit = 10
): Promise<OFFFood[]> {
  if (!query.trim()) return [];
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("query", query);
  // Over-fetch then re-rank, since Branded results would otherwise dominate.
  url.searchParams.set("pageSize", String(limit * 4));
  // IMPORTANT: USDA's API rejects comma-separated dataType values with a 404.
  // It expects multiple ?dataType= params instead.
  for (const dt of DATA_TYPES) {
    url.searchParams.append("dataType", dt);
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { foods?: USDAFood[] };
    const foods = data.foods || [];

    const adapted = foods
      .map((f) => ({ raw: f, food: toOFFFood(f) }))
      .filter((x): x is { raw: USDAFood; food: OFFFood } => x.food !== null);

    // Rank: whole-food datasets first, then Survey, then Branded last.
    const rank: Record<string, number> = {
      Foundation: 0,
      "SR Legacy": 1,
      "Survey (FNDDS)": 2,
      Branded: 3,
    };
    adapted.sort(
      (a, b) =>
        (rank[a.raw.dataType ?? ""] ?? 4) - (rank[b.raw.dataType ?? ""] ?? 4)
    );

    return adapted.slice(0, limit).map((x) => x.food);
  } catch {
    return [];
  }
}

/**
 * Some data sources (OpenFoodFacts serving_size, AI-parsed descriptions,
 * and legacy DB entries) prefix the description with "1 " or "1 × 1 "
 * because they assume a single-serving display. We have an explicit
 * servings stepper, so those prefixes read redundantly:
 *   "1 × 1 Slice (30 g)" → stored display would be "1 × 1 × 1 Slice"
 *
 * Strategy: iteratively strip leading "1 " (when followed by non-digit)
 * or "× " (the legacy prefix that older submitAll injected) until the
 * string stabilizes. Preserves "100 g" and "1.5 cup".
 */
export function cleanServingDescription(
  s: string | null | undefined
): string | undefined {
  if (!s) return s ?? undefined;
  let result = s.trim();
  let prev = "";
  while (result !== prev && result.length > 0) {
    prev = result;
    result = result
      .replace(/^1\s+(?=\D)/, "")
      .replace(/^×\s*/, "");
  }
  return result || undefined;
}

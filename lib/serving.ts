/**
 * Some data sources (OpenFoodFacts serving_size, AI-parsed descriptions,
 * legacy DB entries) prefix the description with "1 " because they assume
 * a single-serving display. We have an explicit servings stepper, so
 * "1 × 1 Slice (30 g)" reads redundantly. Strip a leading "1 " when the
 * next character is non-digit (preserves things like "100 g" or "1.5 cup").
 */
export function cleanServingDescription(
  s: string | null | undefined
): string | undefined {
  if (!s) return s ?? undefined;
  return s.trim().replace(/^1\s+(?=\D)/, "") || undefined;
}

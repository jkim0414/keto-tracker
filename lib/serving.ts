/**
 * Strip a legacy "N × " prefix from a serving description.
 *
 * Old food entries (before the servings/per-serving schema split) baked the
 * multiplier into the description string: "2 × 1 Slice (30 g)". With the new
 * schema, the multiplier lives in the `servings` column, so the description
 * should be the singular form ("1 Slice (30 g)").
 *
 * IMPORTANT: a leading "1 " followed by text is intentional and PRESERVED
 * (e.g. "1 sausage", "1 cup", "1 large egg"). The convention is that each
 * description describes ONE atomic serving with an explicit count of 1.
 */
export function cleanServingDescription(
  s: string | null | undefined
): string | undefined {
  if (!s) return s ?? undefined;
  let result = s.trim();
  let prev = "";
  while (result !== prev && result.length > 0) {
    prev = result;
    result = result.replace(/^\d+(?:\.\d+)?\s*×\s*/, "");
  }
  return result || undefined;
}

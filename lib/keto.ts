export const KETOSIS_CEILING_G = 50;

export type CarbBucket = "green" | "yellow" | "red";

export function carbBucket(consumedG: number, goalG: number): CarbBucket {
  if (consumedG <= goalG) return "green";
  if (consumedG <= Math.max(goalG, KETOSIS_CEILING_G)) return "yellow";
  return "red";
}

export function bucketColor(bucket: CarbBucket): string {
  switch (bucket) {
    case "green":
      return "var(--color-accent)";
    case "yellow":
      return "var(--color-warn)";
    case "red":
      return "var(--color-danger)";
  }
}

import { bucketColor, carbBucket, KETOSIS_CEILING_G } from "@/lib/keto";

type Props = {
  consumed: number;
  goal: number;
  size?: number;
};

/**
 * Two concentric rings:
 *  - Outer: progress toward your daily goal. Fills 0 → 100% in green; once
 *    you hit goal it stays full green ("you closed your ring").
 *  - Inner: only appears when consumed > goal. Shows how far you are
 *    through the yellow zone (goal → 50g). Yellow while in that zone,
 *    flips to red once consumed crosses the 50g ketosis ceiling.
 *
 * Headline number color follows the bucket (green/yellow/red).
 */
export default function CarbRing({ consumed, goal, size = 180 }: Props) {
  const outerStroke = 14;
  const innerStroke = 8;
  const gap = 5;

  const outerR = (size - outerStroke) / 2;
  const outerC = 2 * Math.PI * outerR;
  const outerRatio = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const outerDash = outerC * outerRatio;

  const innerR = outerR - outerStroke / 2 - gap - innerStroke / 2;
  const innerC = 2 * Math.PI * innerR;
  const overSpan = Math.max(0, KETOSIS_CEILING_G - goal);
  const showInner = consumed > goal && overSpan > 0;
  const overProgress = overSpan > 0
    ? Math.min((consumed - goal) / overSpan, 1)
    : 0;
  const innerDash = innerC * overProgress;

  const bucket = carbBucket(consumed, goal);
  const headlineColor = bucketColor(bucket);
  const innerColor = bucket === "red"
    ? "var(--color-danger)"
    : "var(--color-warn)";

  const over = consumed > goal;
  const remaining = Math.max(goal - consumed, 0);
  const overBy = Math.max(consumed - goal, 0);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        {/* Outer track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerR}
          stroke="var(--color-border)"
          strokeWidth={outerStroke}
          fill="none"
        />
        {/* Outer fill (always green) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerR}
          stroke="var(--color-accent)"
          strokeWidth={outerStroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${outerDash} ${outerC}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 400ms ease" }}
        />

        {showInner && (
          <>
            {/* Inner track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={innerR}
              stroke="var(--color-border)"
              strokeWidth={innerStroke}
              fill="none"
              opacity={0.6}
            />
            {/* Inner fill (yellow → red) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={innerR}
              stroke={innerColor}
              strokeWidth={innerStroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${innerDash} ${innerC}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{
                transition: "stroke-dasharray 400ms ease, stroke 200ms ease",
              }}
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-semibold tabular-nums"
          style={{ color: headlineColor }}
        >
          {consumed.toFixed(1)}
        </span>
        <span className="text-xs text-muted mt-1">/ {goal}g net carbs</span>
        <span className="text-xs mt-1" style={{ color: headlineColor }}>
          {over
            ? `${overBy.toFixed(1)}g over`
            : `${remaining.toFixed(1)}g left`}
        </span>
      </div>
    </div>
  );
}

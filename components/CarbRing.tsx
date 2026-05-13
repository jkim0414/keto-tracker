import { bucketColor, carbBucket, KETOSIS_CEILING_G } from "@/lib/keto";

type Props = {
  consumed: number;
  goal: number;
  size?: number;
};

/**
 * Two concentric rings:
 *  - Inner (primary): progress toward goal. Fills 0 → 100% in the bucket
 *    color: green under goal, yellow once you pass goal, red past 50g.
 *    "Closing" this ring means hitting your daily goal.
 *  - Outer (overflow): only appears when consumed > goal. Fills 0 → 100%
 *    as consumed scales from goal up to the 50g ketosis ceiling. Yellow
 *    in the tolerance zone, red past the ceiling.
 *
 * No green anywhere once you're past goal — the inner ring flips to yellow
 * (and then red) so the visual matches the bucket exactly.
 */
export default function CarbRing({ consumed, goal, size = 180 }: Props) {
  const outerStroke = 10;
  const innerStroke = 14;
  const gap = 5;

  // Outer ring (bigger radius): overflow tracker
  const outerR = (size - outerStroke) / 2;
  const outerC = 2 * Math.PI * outerR;

  // Inner ring (smaller radius): primary goal-progress ring
  const innerR = outerR - outerStroke / 2 - gap - innerStroke / 2;
  const innerC = 2 * Math.PI * innerR;

  const bucket = carbBucket(consumed, goal);
  const headlineColor = bucketColor(bucket);

  // Inner ring: scale 0 → goal, bucket color
  const innerRatio = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const innerDash = innerC * innerRatio;
  const innerColor = headlineColor;

  // Outer ring: scale goal → KETOSIS_CEILING, visible only over goal
  const overSpan = Math.max(0, KETOSIS_CEILING_G - goal);
  const showOuter = consumed > goal && overSpan > 0;
  const overRatio =
    overSpan > 0 ? Math.min((consumed - goal) / overSpan, 1) : 0;
  const outerDash = outerC * overRatio;
  const outerColor =
    bucket === "red" ? "var(--color-danger)" : "var(--color-warn)";

  const over = consumed > goal;
  const remaining = Math.max(goal - consumed, 0);
  const overBy = Math.max(consumed - goal, 0);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        {showOuter && (
          <>
            {/* Outer track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={outerR}
              stroke="var(--color-border)"
              strokeWidth={outerStroke}
              fill="none"
              opacity={0.6}
            />
            {/* Outer fill (yellow → red) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={outerR}
              stroke={outerColor}
              strokeWidth={outerStroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${outerDash} ${outerC}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{
                transition: "stroke-dasharray 400ms ease, stroke 200ms ease",
              }}
            />
          </>
        )}

        {/* Inner track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerR}
          stroke="var(--color-border)"
          strokeWidth={innerStroke}
          fill="none"
        />
        {/* Inner fill (bucket color) */}
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

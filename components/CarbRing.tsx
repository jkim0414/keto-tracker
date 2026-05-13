import { bucketColor, carbBucket } from "@/lib/keto";

type Props = {
  consumed: number;
  goal: number;
  size?: number;
};

export default function CarbRing({ consumed, goal, size = 180 }: Props) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Scale to the goal: 100% = goal reached. Color shifts to yellow/red
  // once you've gone over (see lib/keto.ts buckets).
  const ratio = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dash = circumference * ratio;
  const remaining = Math.max(goal - consumed, 0);
  const over = consumed > goal;
  const color = bucketColor(carbBucket(consumed, goal));

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tabular-nums" style={{ color }}>
          {consumed.toFixed(1)}
        </span>
        <span className="text-xs text-muted mt-1">
          / {goal}g net carbs
        </span>
        <span className="text-xs mt-1" style={{ color }}>
          {over
            ? `${(consumed - goal).toFixed(1)}g over`
            : `${remaining.toFixed(1)}g left`}
        </span>
      </div>
    </div>
  );
}

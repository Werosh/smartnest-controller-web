/**
 * CircularGauge - SVG-based circular progress gauge
 * Props:
 *   percent  - 0–100
 *   label    - caption below value
 *   size     - SVG dimension (default 140)
 *   stroke   - gauge stroke color (default accent)
 */
export default function CircularGauge({
  percent = 0,
  label = '',
  size = 140,
  stroke = '#22c55e',
}) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(percent, 0), 100) / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1e2a42"
          strokeWidth={10}
        />
        {/* Filled arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Value overlay */}
      <div
        className="flex flex-col items-center -mt-[calc(var(--size)/2+2rem)]"
        style={{ marginTop: `-${size / 2 + 8}px` }}
      >
        <span className="text-text font-bold text-2xl leading-tight">
          {percent.toFixed(0)}%
        </span>
        <span className="text-muted text-xs text-center leading-tight">{label}</span>
      </div>
    </div>
  );
}

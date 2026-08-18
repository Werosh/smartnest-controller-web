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
  const isPositive = percent >= 0;
  const absPercent = Math.abs(percent);
  
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(absPercent, 0), 100) / 100) * circumference;
  const center = size / 2;

  const displayStroke = isPositive ? stroke : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90 filter drop-shadow-lg">
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
          stroke={displayStroke}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Value overlay */}
      <div
        className="flex flex-col items-center justify-center relative z-10"
        style={{ marginTop: `-${size / 2 + 24}px` }}
      >
        <span className={`font-bold text-3xl leading-tight ${isPositive ? 'text-text' : 'text-red-400'}`}>
          {isPositive && percent > 0 ? '+' : ''}{percent.toFixed(0)}%
        </span>
        <span className="text-muted text-xs text-center leading-tight mt-1">{label}</span>
      </div>
    </div>
  );
}

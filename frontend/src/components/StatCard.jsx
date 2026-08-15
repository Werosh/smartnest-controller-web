import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard - reusable metric card
 * Props:
 *   icon     - lucide-react icon component
 *   label    - string label
 *   value    - formatted string value
 *   unit     - optional unit suffix
 *   trend    - 'up' | 'down' | 'neutral'
 *   trendVal - e.g. "+12%" or "-3%"
 *   color    - tailwind bg class for icon background (default: bg-accent/10)
 *   iconColor- tailwind text class for icon (default: text-accent)
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  unit = '',
  trend = 'neutral',
  trendVal = '',
  color = 'bg-accent/10',
  iconColor = 'text-accent',
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-accent' :
      trend === 'down' ? 'text-red-400' :
        'text-muted';

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${color} group-hover:scale-105 transition-transform duration-200`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trendVal && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendVal}
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className="text-muted text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-text text-2xl font-bold mt-0.5 leading-tight">
          {value}
          {unit && <span className="text-muted text-sm font-normal ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

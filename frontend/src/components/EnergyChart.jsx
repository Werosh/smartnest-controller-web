import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { Activity } from 'lucide-react';

const CHART_WINDOW = 30; // last N reading buckets to show

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-border rounded-xl px-3 py-2 text-xs shadow-card">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toFixed(1)}W
        </p>
      ))}
    </div>
  );
}

// Color palette for multiple module lines
const LINE_COLORS = ['#22c55e', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6', '#34d399'];

export default function EnergyChart() {
  const [chartData, setChartData] = useState([]);
  const [moduleIds, setModuleIds] = useState([]);

  // Build chart data: aggregate readings by time buckets per module
  const buildChart = useCallback(async () => {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // last 10 min

    const { data: rawReadings } = await supabase
      .from('readings')
      .select('module_id, watts, at')
      .gte('at', since)
      .order('at', { ascending: true });

    if (!rawReadings || rawReadings.length === 0) {
      setChartData([]);
      return;
    }

    // Collect unique module IDs
    const ids = [...new Set(rawReadings.map(r => r.module_id))];
    setModuleIds(ids);

    // Group by ~15s buckets
    const BUCKET_MS = 15_000;
    const buckets = {};
    for (const r of rawReadings) {
      const t = Math.floor(new Date(r.at).getTime() / BUCKET_MS) * BUCKET_MS;
      const key = new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (!buckets[key]) buckets[key] = { time: key };
      if (!buckets[key][r.module_id]) buckets[key][r.module_id] = 0;
      buckets[key][r.module_id] = Math.max(buckets[key][r.module_id], r.watts);
    }

    const data = Object.values(buckets).slice(-CHART_WINDOW);
    setChartData(data);
  }, []);

  useEffect(() => {
    buildChart();

    // Subscribe to new readings via Realtime
    const channel = supabase
      .channel('readings-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'readings' },
        () => buildChart()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [buildChart]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-text font-semibold text-base">Energy Usage Overview</h2>
          <p className="text-muted text-xs mt-0.5">Live power consumption — last 10 minutes</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-accent font-medium">
          <span className="live-dot" />
          Live
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted gap-3">
          <Activity className="w-8 h-8 opacity-40" />
          <p className="text-sm">Turn on a module to see live energy data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a42" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#8b96ab' }}
              axisLine={{ stroke: '#1e2a42' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#8b96ab' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}W`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#8b96ab', paddingTop: '12px' }}
            />
            {moduleIds.map((id, i) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={id}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

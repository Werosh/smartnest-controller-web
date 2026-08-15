import { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function formatCountdown(ts) {
  const diff = new Date(ts) - Date.now();
  if (diff <= 0) return 'Firing soon...';
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SchedulesPanel({ modules }) {
  const [tick, setTick] = useState(0);

  // Force re-render every second to update countdowns
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const scheduled = (modules ?? []).filter(m => m.timer_at && new Date(m.timer_at) > Date.now() - 5000);

  async function clearTimer(id) {
    await supabase.from('modules').update({ timer_at: null }).eq('id', id);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-4 h-4 text-muted" />
        <h2 className="text-text font-semibold text-base">Schedules & Timers</h2>
        {scheduled.length > 0 && (
          <span className="badge badge-yellow">{scheduled.length} active</span>
        )}
      </div>

      {scheduled.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-20 text-muted gap-2">
          <Clock className="w-6 h-6 opacity-40" />
          <p className="text-sm">No active schedules — set a timer on any module</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {scheduled.map(m => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-bg border border-border rounded-xl px-4 py-3 hover:border-yellow-500/20 transition-colors"
            >
              <div>
                <p className="text-text text-sm font-medium">{m.name}</p>
                <p className="text-muted text-xs mt-0.5">
                  Will turn {m.desired_state ? 'OFF' : 'ON'} in{' '}
                  <span className="text-yellow-400 font-semibold">
                    {formatCountdown(m.timer_at)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => clearTimer(m.id)}
                className="text-xs text-muted hover:text-red-400 transition-colors px-2 py-1"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

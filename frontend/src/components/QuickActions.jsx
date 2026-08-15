import { useState } from 'react';
import { PowerOff, FileText, CalendarPlus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function QuickActions({ modules }) {
  const [turningOff, setTurningOff] = useState(false);
  const [done, setDone] = useState(false);

  async function turnOffAll() {
    if (turningOff) return;
    setTurningOff(true);
    setDone(false);
    try {
      const ids = (modules ?? []).map(m => m.id);
      if (ids.length === 0) return;
      // Bulk update desired_state = false for all modules
      await supabase
        .from('modules')
        .update({ desired_state: false, timer_at: null })
        .in('id', ids);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } finally {
      setTurningOff(false);
    }
  }

  function downloadReport() {
    if (!modules) return;
    const lines = [
      'SmartNest V1 - Energy Report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Module,Type,State,Watts',
      ...(modules ?? []).map(m =>
        `${m.name},${m.type},${m.desired_state ? 'ON' : 'OFF'},${m.watts}`
      ),
      '',
      `Total Active Power: ${modules.filter(m => m.desired_state).reduce((s, m) => s + m.watts, 0).toFixed(1)} W`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartnest-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card p-6">
      <h2 className="text-text font-semibold text-base mb-4">Quick Actions</h2>

      <div className="flex flex-col gap-3">
        <button
          id="turn-off-all-btn"
          onClick={turnOffAll}
          disabled={turningOff}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all duration-200
            ${done
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30'
            }`}
        >
          {turningOff
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <PowerOff className="w-4 h-4" />
          }
          <div className="text-left">
            <p className="text-sm font-semibold">
              {done ? 'All Modules Off!' : turningOff ? 'Turning Off...' : 'Turn Off All Modules'}
            </p>
            <p className="text-xs opacity-70 mt-0.5">
              {(modules ?? []).filter(m => m.desired_state).length} currently on
            </p>
          </div>
        </button>

        <button
          id="energy-report-btn"
          onClick={downloadReport}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-bg hover:bg-border/40 text-text transition-all duration-200"
        >
          <FileText className="w-4 h-4 text-muted" />
          <div className="text-left">
            <p className="text-sm font-semibold">Energy Report</p>
            <p className="text-xs text-muted mt-0.5">Download current readings as text</p>
          </div>
        </button>

        <button
          id="add-schedule-btn"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-dashed border-border text-muted hover:text-text hover:border-accent/30 transition-all duration-200"
        >
          <CalendarPlus className="w-4 h-4" />
          <div className="text-left">
            <p className="text-sm font-medium">Add New Schedule</p>
            <p className="text-xs opacity-70 mt-0.5">Set a timer on any module card</p>
          </div>
        </button>
      </div>
    </div>
  );
}

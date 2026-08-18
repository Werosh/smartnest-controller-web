import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Clock, Activity, Zap } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchHistory() {
    setLoading(true);
    // Fetch last 50 readings with module details
    const { data, error } = await supabase
      .from('readings')
      .select(`
        id,
        watts,
        at,
        module_id,
        modules ( name, type )
      `)
      .order('at', { ascending: false })
      .limit(50);
      
    if (data) {
      setHistory(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchHistory();
    
    // Optional: Subscribe to realtime readings to keep the history table live
    const channel = supabase
      .channel('history-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'readings' },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-muted" />
          <h2 className="text-xl font-semibold text-text">System History</h2>
        </div>
        <button
          onClick={fetchHistory}
          className="text-muted hover:text-text text-sm transition-colors"
        >
          Refresh Log
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border bg-bg/50">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            Recent Telemetry Log (Last 50)
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center text-muted">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted gap-3">
            <Clock className="w-8 h-8 opacity-40" />
            <p>No telemetry data recorded yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Stacked Cards */}
            <div className="md:hidden divide-y divide-border border-t border-border">
              {history.map((row) => (
                <div key={row.id} className="p-4 flex flex-col gap-2 hover:bg-bg/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-text text-sm">
                        {row.modules?.name || row.module_id}
                      </p>
                      <p className="text-xs text-muted capitalize mt-0.5">
                        {row.modules?.type || 'unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-bg border border-border px-2 py-1 rounded-lg">
                      <Zap className={`w-3.5 h-3.5 ${row.watts > 1000 ? 'text-red-400' : 'text-yellow-400'}`} />
                      <span className={`text-xs ${row.watts > 1000 ? 'text-red-400 font-semibold' : 'text-text font-medium'}`}>
                        {row.watts} W
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted font-mono">{new Date(row.at).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg border-b border-border text-xs text-muted">
                    <th className="p-4 font-medium">Timestamp</th>
                    <th className="p-4 font-medium">Appliance</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Power (Watts)</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-text">
                  {history.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-bg/50 transition-colors">
                      <td className="p-4 whitespace-nowrap text-muted text-xs">
                        {new Date(row.at).toLocaleString()}
                      </td>
                      <td className="p-4 font-medium">
                        {row.modules?.name || row.module_id}
                      </td>
                      <td className="p-4 capitalize text-muted">
                        {row.modules?.type || 'unknown'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Zap className={`w-3.5 h-3.5 ${row.watts > 1000 ? 'text-red-400' : 'text-yellow-400'}`} />
                          <span className={row.watts > 1000 ? 'text-red-400 font-semibold' : ''}>
                            {row.watts} W
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

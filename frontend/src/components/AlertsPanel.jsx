import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, Zap, Bell, X } from 'lucide-react';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchAlerts() {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('at', { ascending: false })
      .limit(20);
    if (data) setAlerts(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        payload => {
          setAlerts(prev => [payload.new, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="card p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted" />
          <h2 className="text-text font-semibold text-base">Alerts</h2>
          {alerts.length > 0 && (
            <span className="badge badge-red">{alerts.length}</span>
          )}
        </div>
        <button
          onClick={fetchAlerts}
          className="text-muted hover:text-text text-xs transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
        {loading ? (
          <div className="flex items-center justify-center h-20 text-muted text-sm">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-muted gap-2">
            <Zap className="w-6 h-6 opacity-40" />
            <p className="text-sm">No alerts - all systems normal</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-start gap-3 bg-bg rounded-xl p-3 border border-border hover:border-red-500/20 transition-colors group"
            >
              <div className="p-1.5 bg-red-500/10 rounded-lg flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text text-xs font-medium leading-snug truncate">
                  {alert.module_name ?? alert.module_id ?? 'Unknown'}
                </p>
                <p className="text-muted text-xs mt-0.5 leading-snug">{alert.message}</p>
              </div>
              <span className="text-muted text-xs flex-shrink-0 mt-0.5">{timeAgo(alert.at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

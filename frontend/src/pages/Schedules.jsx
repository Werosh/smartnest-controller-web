import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import SchedulesPanel from '../components/SchedulesPanel';
import { Calendar } from 'lucide-react';

export default function Schedules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModules() {
      const { data } = await supabase.from('modules').select('*').order('name');
      if (data) setModules(data);
      setLoading(false);
    }

    fetchModules();

    const channel = supabase
      .channel('schedules-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'modules' },
        payload => {
          if (payload.eventType === 'INSERT') {
            setModules(prev => [...prev, payload.new].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setModules(prev =>
              prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
            );
          } else if (payload.eventType === 'DELETE') {
            setModules(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-6 h-6 text-muted" />
        <h2 className="text-xl font-semibold text-text">Schedules & Timers</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="card p-6 h-40 animate-pulse bg-card" />
        ) : (
          <SchedulesPanel modules={modules} />
        )}
        
        <div className="card p-6 border-dashed border-border/50 text-muted flex flex-col justify-center items-center text-center gap-2">
          <Calendar className="w-8 h-8 opacity-40 mb-2" />
          <p className="text-sm font-medium">Want to schedule a device?</p>
          <p className="text-xs">Go to the Modules page and click "Set timer" on any device to add it here.</p>
        </div>
      </div>
    </div>
  );
}

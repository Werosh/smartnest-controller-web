import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import ModuleCard from '../components/ModuleCard';
import AddModuleModal from '../components/AddModuleModal';
import { Cpu, Plus } from 'lucide-react';

export default function Modules() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  async function fetchModules() {
    const { data } = await supabase.from('modules').select('*').order('name');
    if (data) setModules(data);
    setLoadingModules(false);
  }

  useEffect(() => {
    fetchModules();

    const channel = supabase
      .channel('modules-page')
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

  async function handleDelete(id) {
    if (!window.confirm('Delete this module? This cannot be undone.')) return;
    await supabase.from('modules').delete().eq('id', id);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-muted" />
          <h2 className="text-xl font-semibold text-text">All Modules</h2>
          <span className="badge badge-muted ml-2">{modules.length}</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Module
        </button>
      </div>

      {loadingModules ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 h-40 animate-pulse bg-card" />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-muted gap-4">
          <Cpu className="w-12 h-12 opacity-30" />
          <p className="text-base">No modules registered yet</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm py-2 px-6">
            Register First Module
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules.map(m => (
            <ModuleCard
              key={m.id}
              module={m}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddModuleModal
          onClose={() => setShowAddModal(false)}
          onAdded={fetchModules}
        />
      )}
    </div>
  );
}

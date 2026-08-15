import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { ShieldCheck, Users, Cpu, Trash2, RefreshCw, Plus, ChevronDown } from 'lucide-react';
import AddModuleModal from '../components/AddModuleModal';

// ────────────────────────────────────────────────────────────
// User Management Table
// ────────────────────────────────────────────────────────────
function UsersTable() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  async function fetchProfiles() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*, modules(*)').order('created_at');
    if (data) setProfiles(data);
    setLoading(false);
  }

  useEffect(() => { fetchProfiles(); }, []);

  async function toggleRole(profile) {
    const newRole = profile.role === 'admin' ? 'user' : 'admin';
    await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id);
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, role: newRole } : p));
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted" />
          <h2 className="text-text font-semibold text-base">User Management</h2>
          <span className="badge badge-muted">{profiles.length} users</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchProfiles} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Assign Module
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-bg rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-border">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Assigned Modules</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map(p => (
                <tr key={p.id} className="hover:bg-bg/40 transition-colors">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(p.name ?? 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-text font-medium">{p.name}</p>
                        <p className="text-muted text-xs font-mono truncate max-w-[200px]">
                          {p.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`badge ${p.role === 'admin' ? 'badge-green' : 'badge-muted'}`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    {p.modules && p.modules.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.modules.map(m => (
                          <span key={m.id} className="badge badge-muted text-[10px] capitalize flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${m.state ? 'bg-green-400' : 'bg-gray-400'}`} />
                            {m.name} ({m.type})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted text-xs italic">No modules</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    {p.id !== currentUser?.id && (
                      <button
                        id={`toggle-role-${p.id}`}
                        onClick={() => toggleRole(p)}
                        className="text-xs text-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-accent/10"
                      >
                        Make {p.role === 'admin' ? 'User' : 'Admin'}
                      </button>
                    )}
                    {p.id === currentUser?.id && (
                      <span className="text-xs text-muted opacity-50">(you)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-muted text-xs">
          <strong className="text-text">Note:</strong> To invite new users, share the app URL - they can sign up themselves.
          Newly signed-up users start as <code className="text-accent bg-accent/10 px-1 rounded">user</code> role.
          Promote them here after signup.
        </p>
      </div>

      {showModal && (
        <AddModuleModal
          onClose={() => setShowModal(false)}
          onAdded={fetchProfiles}
          profiles={profiles}
        />
      )}
    </div>
  );
}



export default function Admin() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-text font-bold text-lg">Admin Panel</h1>
          <p className="text-muted text-xs">Manage users, roles, and device modules</p>
        </div>
      </div>

      <UsersTable />

      {/* Manual admin promotion reminder */}
      <div className="card p-5 border-yellow-500/20">
        <p className="text-yellow-400 text-sm font-semibold mb-1">⚡ First-time setup reminder</p>
        <p className="text-muted text-xs leading-relaxed">
          To promote a user to admin, use the "Make Admin" button above, or run in Supabase SQL:{' '}
          <code className="bg-bg text-accent px-2 py-0.5 rounded text-xs">
            UPDATE profiles SET role = 'admin' WHERE id = '&lt;uuid&gt;';
          </code>
        </p>
      </div>
    </div>
  );
}

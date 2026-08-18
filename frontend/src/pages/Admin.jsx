import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { ShieldCheck, Users, Cpu, Trash2, RefreshCw, Plus, ChevronDown, Power } from 'lucide-react';
import AddModuleModal from '../components/AddModuleModal';
import ConfirmModal from '../components/ConfirmModal';

// ────────────────────────────────────────────────────────────
// User Management Table
// ────────────────────────────────────────────────────────────
function UsersTable() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [managingUserId, setManagingUserId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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

  async function toggleStatus(profile) {
    const newStatus = profile.status === 'active' ? 'deactivated' : 'active';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', profile.id);
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, status: newStatus } : p));
  }

  async function handleDeleteModuleConfirm() {
    if (!confirmDeleteId) return;
    await supabase.from('modules').delete().eq('id', confirmDeleteId);
    setConfirmDeleteId(null);
    fetchProfiles();
  }

  async function handleToggleModule(module) {
    const newState = !module.desired_state;
    // Optimistic update in UI
    setProfiles(prev => prev.map(p => {
      if (p.id !== module.owner_id) return p;
      return {
        ...p,
        modules: p.modules.map(m => m.id === module.id ? { ...m, desired_state: newState, state: newState } : m)
      };
    }));
    await supabase.from('modules').update({ desired_state: newState }).eq('id', module.id);
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
                <th className="pb-3 font-medium w-10"></th>
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Modules</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map(p => (
                <React.Fragment key={p.id}>
                  <tr 
                    className="hover:bg-bg/40 transition-colors cursor-pointer group"
                    onClick={() => setExpandedUserId(expandedUserId === p.id ? null : p.id)}
                  >
                    <td className="py-3.5 pr-4 text-center">
                      <ChevronDown className={`w-4 h-4 text-muted inline-block transition-transform ${expandedUserId === p.id ? 'rotate-180' : ''}`} />
                    </td>
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
                      <span className={`badge ${p.status === 'deactivated' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        {p.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-text font-medium text-sm">
                        {p.modules ? p.modules.length : 0} <span className="text-muted font-normal">appliances</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-right flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      {p.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => toggleRole(p)}
                            className="text-xs text-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-accent/10"
                          >
                            Make {p.role === 'admin' ? 'User' : 'Admin'}
                          </button>
                          <button
                            onClick={() => toggleStatus(p)}
                            className={`text-xs transition-colors px-2 py-1 rounded-lg ${
                              p.status === 'deactivated' 
                                ? 'text-green-400 hover:bg-green-400/10' 
                                : 'text-red-400 hover:bg-red-400/10'
                            }`}
                          >
                            {p.status === 'deactivated' ? 'Reactivate' : 'Deactivate'}
                          </button>
                        </>
                      )}
                      {p.id === currentUser?.id && (
                        <span className="text-xs text-muted opacity-50">(you)</span>
                      )}
                    </td>
                  </tr>
                  {expandedUserId === p.id && (
                    <tr className="bg-bg/30">
                      <td colSpan={6} className="px-6 py-4 border-b border-border">
                        <div className="pl-12">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                              User's Modules {p.status === 'deactivated' ? '(Admin Management Mode)' : '(Read-Only Overview)'}
                            </h4>
                            {p.status === 'deactivated' && (
                              <button
                                onClick={() => setManagingUserId(p.id)}
                                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                              >
                                <Plus className="w-3 h-3" />
                                Add Module
                              </button>
                            )}
                          </div>
                          
                          {p.modules && p.modules.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {p.modules.map(m => (
                                <div key={m.id} className={`bg-panel border border-border rounded-xl p-3 flex items-center justify-between ${p.status === 'active' ? 'opacity-80' : ''}`}>
                                  <div>
                                    <p className="text-sm font-medium text-text">{m.name}</p>
                                    <p className="text-xs text-muted capitalize">{m.type} • ID: {m.id.slice(0,8)}</p>
                                  </div>
                                  
                                  {p.status === 'deactivated' ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleToggleModule(m)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          m.desired_state 
                                            ? 'bg-accent/20 text-accent hover:bg-accent/30' 
                                            : 'bg-bg text-muted hover:text-text'
                                        }`}
                                      >
                                        <Power className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(m.id)}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className={`px-2 py-1 rounded text-xs font-semibold ${m.state ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                      {m.state ? 'ON' : 'OFF'}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted italic">This user has no modules registered.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-muted text-xs">
          <strong className="text-text">Note:</strong> To invite new users, share the app URL - they can sign up themselves.
          Active users strictly manage their own modules. Admins can manage a user's modules ONLY if their account is deactivated.
        </p>
      </div>

      {managingUserId && (
        <AddModuleModal
          onClose={() => setManagingUserId(null)}
          onAdded={fetchProfiles}
          targetOwnerId={managingUserId}
        />
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Module"
          message="Are you sure you want to delete this user's module? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDeleteModuleConfirm}
          onCancel={() => setConfirmDeleteId(null)}
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

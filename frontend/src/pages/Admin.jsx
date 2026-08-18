import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { ShieldCheck, Users, Cpu, Trash2, RefreshCw, Plus, ChevronDown } from 'lucide-react';

// ────────────────────────────────────────────────────────────
// User Management Table
// ────────────────────────────────────────────────────────────
function UsersTable() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);

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
                      <span className="text-text font-medium text-sm">
                        {p.modules ? p.modules.length : 0} <span className="text-muted font-normal">appliances</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-right" onClick={e => e.stopPropagation()}>
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
                  {expandedUserId === p.id && (
                    <tr className="bg-bg/30">
                      <td colSpan={5} className="px-6 py-4 border-b border-border">
                        <div className="pl-12">
                          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">User's Modules (Read-Only Overview)</h4>
                          {p.modules && p.modules.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {p.modules.map(m => (
                                <div key={m.id} className="bg-panel border border-border rounded-xl p-3 flex items-center justify-between opacity-80">
                                  <div>
                                    <p className="text-sm font-medium text-text">{m.name}</p>
                                    <p className="text-xs text-muted capitalize">{m.type} • ID: {m.id.slice(0,8)}</p>
                                  </div>
                                  <div className={`px-2 py-1 rounded text-xs font-semibold ${m.state ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                    {m.state ? 'ON' : 'OFF'}
                                  </div>
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
          Newly signed-up users start as <code className="text-accent bg-accent/10 px-1 rounded">user</code> role.
          Promote them here after signup. Modules are strictly managed by users themselves.
        </p>
      </div>
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

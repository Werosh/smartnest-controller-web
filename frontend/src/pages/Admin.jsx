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

  async function fetchProfiles() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at');
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
        <button onClick={fetchProfiles} className="btn-ghost text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
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
                <th className="pb-3 font-medium">Joined</th>
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
                  <td className="py-3.5 pr-4 text-muted text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
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
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Module Management Table
// ────────────────────────────────────────────────────────────
function ModulesTable() {
  const [modules, setModules] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function fetchModulesAndProfiles() {
    setLoading(true);
    const [modulesRes, profilesRes] = await Promise.all([
      supabase.from('modules').select('*, profiles(name)').order('name'),
      supabase.from('profiles').select('*').order('name')
    ]);
    if (modulesRes.data) setModules(modulesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  }

  useEffect(() => { fetchModulesAndProfiles(); }, []);

  async function deleteModule(id) {
    if (!window.confirm(`Delete module "${id}"? All readings and alerts for this module will also be removed.`)) return;
    await supabase.from('modules').delete().eq('id', id);
    setModules(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-muted" />
          <h2 className="text-text font-semibold text-base">Module Registry</h2>
          <span className="badge badge-muted">{modules.length} modules</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchModulesAndProfiles} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            id="admin-add-module-btn"
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Module
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
                <th className="pb-3 font-medium">Module</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Owner</th>
                <th className="pb-3 font-medium">State</th>
                <th className="pb-3 font-medium">Power</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modules.map(m => (
                <tr key={m.id} className="hover:bg-bg/40 transition-colors">
                  <td className="py-3.5 pr-4">
                    <p className="text-text font-medium">{m.name}</p>
                    <p className="text-muted text-xs font-mono">{m.id}</p>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="badge badge-muted capitalize">{m.type}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-text font-medium text-xs">
                    {m.profiles?.name || 'Unknown'}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`badge ${m.state ? 'badge-green' : 'badge-muted'}`}>
                      {m.state ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-text font-medium">
                    {m.watts.toFixed(1)} W
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      id={`delete-module-${m.id}`}
                      onClick={() => deleteModule(m.id)}
                      className="text-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted text-sm">
                    No modules registered yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddModuleModal
          onClose={() => setShowModal(false)}
          onAdded={fetchModulesAndProfiles}
          profiles={profiles}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Admin Page
// ────────────────────────────────────────────────────────────
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
      <ModulesTable />

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

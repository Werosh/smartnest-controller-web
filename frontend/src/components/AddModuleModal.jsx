import { useState } from 'react';
import { X, Lightbulb, Fan, Plug, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

const TYPES = [
  { value: 'bulb',   label: 'Light Bulb',    Icon: Lightbulb },
  { value: 'fan',    label: 'Fan',            Icon: Fan },
  { value: 'outlet', label: 'Smart Outlet',   Icon: Plug },
];

export default function AddModuleModal({ onClose, onAdded, profiles = [] }) {
  const { profile: currentProfile } = useAuth();
  const isAdmin = currentProfile?.role === 'admin';
  const showOwnerDropdown = isAdmin && profiles.length > 0;

  const [id,   setId]   = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('outlet');
  const [ownerId, setOwnerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!id.trim() || !name.trim()) {
      setError('Module ID and name are required.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(id.trim())) {
      setError('Module ID must be lowercase letters, numbers, and hyphens only.');
      return;
    }
    
    // Determine the actual owner ID to use
    const finalOwnerId = showOwnerDropdown ? ownerId : currentProfile?.id;
    if (!finalOwnerId) {
      setError('You must assign an owner to this module.');
      return;
    }
    
    setLoading(true);
    try {
      const { error: dbErr } = await supabase
        .from('modules')
        .insert({ id: id.trim(), name: name.trim(), type, owner_id: finalOwnerId });
      if (dbErr) throw dbErr;
      onAdded?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-text font-semibold text-base">Register New Module</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Module ID <span className="text-red-400">*</span>
            </label>
            <input
              id="module-id-input"
              type="text"
              value={id}
              onChange={e => setId(e.target.value.toLowerCase())}
              placeholder="e.g. bedroom-light"
              className="input font-mono"
            />
            <p className="text-muted text-xs mt-1">Must match the MQTT module ID on the device</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              id="module-name-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Bedroom Light"
              className="input"
            />
          </div>

          {showOwnerDropdown && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Owner <span className="text-red-400">*</span>
              </label>
              <select
                id="module-owner-input"
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                className="input"
              >
                <option value="" disabled>Select a user...</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Device Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 text-xs font-medium
                    ${type === value
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-bg border-border text-muted hover:border-border/80 hover:text-text'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2.5">
              Cancel
            </button>
            <button
              id="add-module-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Adding...' : 'Add Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

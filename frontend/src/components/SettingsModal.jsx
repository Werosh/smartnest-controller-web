import { useState, useEffect } from 'react';
import { X, User, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

export default function SettingsModal({ onClose }) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', profile.id);

    setSaving(false);
    if (!error) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert('Error updating profile: ' + error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div 
        className="bg-panel w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border bg-bg/50">
          <h2 className="text-text font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-muted" />
            Account Settings
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 ml-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field w-full"
                placeholder="E.g., John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 ml-1">
                Account Role
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded-xl opacity-70">
                <ShieldCheck className={`w-4 h-4 ${profile?.role === 'admin' ? 'text-green-400' : 'text-muted'}`} />
                <span className="text-sm text-text capitalize">{profile?.role || 'User'}</span>
              </div>
              <p className="text-xs text-muted mt-1.5 ml-1">
                Roles can only be changed by an Administrator.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between">
              {success ? (
                <span className="text-green-400 text-sm font-medium animate-fade-in">
                  Profile updated!
                </span>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-muted hover:text-text transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="btn-primary px-6 py-2 text-sm"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

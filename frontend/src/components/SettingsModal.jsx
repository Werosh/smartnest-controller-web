import { useState, useEffect } from 'react';
import { X, User, ShieldCheck, Settings2, Sliders, Bell } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

export default function SettingsModal({ onClose }) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Mock preferences state for the UI
  const [currency, setCurrency] = useState('USD');
  const [spikeAlerts, setSpikeAlerts] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
    }
  }, [profile]);

  async function handleSaveProfile(e) {
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

  function handleSavePreferences(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    // Mock save
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div 
        className="bg-panel w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden animate-slide-up flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-full md:w-48 bg-bg/50 border-b md:border-b-0 md:border-r border-border p-4 flex flex-row md:flex-col gap-2">
          <div className="hidden md:flex items-center gap-2 px-2 pb-4 mb-2 border-b border-border text-text font-semibold">
            <Settings2 className="w-5 h-5 text-muted" />
            Settings
          </div>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors font-medium w-full ${activeTab === 'profile' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text hover:bg-border/50'}`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors font-medium w-full ${activeTab === 'preferences' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text hover:bg-border/50'}`}
          >
            <Sliders className="w-4 h-4" />
            Preferences
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col relative min-h-[400px]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted hover:text-text transition-colors p-1 rounded-full hover:bg-border/50"
          >
            <X className="w-5 h-5" />
          </button>

          {activeTab === 'profile' && (
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-text mb-6">Profile Details</h3>
              <form onSubmit={handleSaveProfile} className="space-y-5 flex-1">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 ml-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input w-full"
                    placeholder="E.g., John Doe"
                  />
                  <p className="text-xs text-muted mt-1.5 ml-1">
                    This name will be displayed across the dashboard.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5 ml-1">
                    Account Role
                  </label>
                  <div className="flex items-center gap-2 px-3 py-3 bg-bg border border-border rounded-xl opacity-70">
                    <ShieldCheck className={`w-5 h-5 ${profile?.role === 'admin' ? 'text-green-400' : 'text-muted'}`} />
                    <div className="flex flex-col">
                      <span className="text-sm text-text capitalize font-medium">{profile?.role || 'User'}</span>
                      <span className="text-xs text-muted">
                        {profile?.role === 'admin' ? 'Full access to all system features.' : 'Standard viewing and control access.'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-auto flex items-center justify-between border-t border-border">
                  {success ? (
                    <span className="text-green-400 text-sm font-medium animate-fade-in">
                      Profile updated successfully!
                    </span>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="btn-ghost">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-text mb-6">Dashboard Preferences</h3>
              <form onSubmit={handleSavePreferences} className="space-y-6 flex-1">
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text border-b border-border pb-2">Localization</h4>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5 ml-1">
                      Currency (for Cost Estimations)
                    </label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="input w-full appearance-none cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-medium text-text border-b border-border pb-2">Notifications</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm text-text font-medium flex items-center gap-2">
                        <Bell className="w-4 h-4 text-muted" />
                        Power Spike Alerts
                      </span>
                      <span className="text-xs text-muted mt-0.5">Receive alerts when devices draw abnormal power.</span>
                    </div>
                    <div
                      className={`toggle ${spikeAlerts ? 'bg-accent' : 'bg-border'}`}
                      onClick={() => setSpikeAlerts(!spikeAlerts)}
                    >
                      <span className={`toggle-thumb ${spikeAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-auto flex items-center justify-between border-t border-border">
                  {success ? (
                    <span className="text-green-400 text-sm font-medium animate-fade-in">
                      Preferences saved!
                    </span>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="btn-ghost">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


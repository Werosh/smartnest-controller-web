import { useState, useEffect as import_react_useEffect } from 'react';
import { Lightbulb, Fan, Plug, Timer, MoreVertical, Trash2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import AlertModal from './AlertModal';

const TYPE_ICONS = {
  bulb:   Lightbulb,
  fan:    Fan,
  outlet: Plug,
};

const TYPE_COLORS = {
  bulb:   { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  fan:    { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  outlet: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

function Toggle({ checked, onChange, id, disabled }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`toggle ${checked ? (disabled ? 'bg-accent/50' : 'bg-accent shadow-glow-sm') : 'bg-border'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`toggle-thumb ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function ModuleCard({ module, isAdmin, currentUserId, onDelete }) {
  const [toggling, setToggling]     = useState(false);
  const [showTimer, setShowTimer]   = useState(false);
  const [timerMins, setTimerMins]   = useState('');
  const [menuOpen, setMenuOpen]     = useState(false);
  const [errorMsg, setErrorMsg]     = useState(null);

  const Icon = TYPE_ICONS[module.type] ?? Plug;
  const colors = TYPE_COLORS[module.type] ?? TYPE_COLORS.outlet;
  
  const isOwner = module.owner_id === currentUserId;
  const canManage = isOwner || isAdmin;

  // Use local state for optimistic UI updates
  const [isOn, setIsOn] = useState(module.desired_state);

  // Sync local state if the server state changes (e.g. via realtime or initial load)
  import_react_useEffect(() => {
    setIsOn(module.desired_state);
  }, [module.desired_state]);

  async function handleToggle() {
    if (toggling || !canManage) return;
    
    // Optimistic update
    const previousState = isOn;
    setIsOn(!previousState);
    setToggling(true);
    
    try {
      const { error } = await supabase
        .from('modules')
        .update({ desired_state: !previousState })
        .eq('id', module.id);
        
      if (error) {
        // Revert on error
        setIsOn(previousState);
        console.error("Failed to toggle module:", error);
        setErrorMsg("Failed to toggle appliance: " + error.message);
      }
    } catch (err) {
      setIsOn(previousState);
    } finally {
      setToggling(false);
    }
  }

  async function handleSetTimer(e) {
    e.preventDefault();
    if (!canManage) return;
    const mins = parseInt(timerMins, 10);
    if (isNaN(mins) || mins <= 0) return;
    const fireAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
    await supabase
      .from('modules')
      .update({ timer_at: fireAt })
      .eq('id', module.id);
    setTimerMins('');
    setShowTimer(false);
  }

  async function handleClearTimer() {
    if (!canManage) return;
    await supabase
      .from('modules')
      .update({ timer_at: null })
      .eq('id', module.id);
  }

  function formatTimer(ts) {
    if (!ts) return null;
    const diff = new Date(ts) - Date.now();
    if (diff <= 0) return 'Firing...';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}m ${s}s`;
  }

  return (
    <div className={`card p-5 flex flex-col gap-4 transition-all duration-300 hover:border-accent/20 animate-slide-up ${isOn ? 'border-accent/15' : ''} ${!isOwner ? 'opacity-90' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${colors.bg} border ${colors.border}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <h3 className="text-text font-semibold text-sm leading-tight">{module.name}</h3>
            <p className="text-muted text-xs capitalize mt-0.5">
              {module.type}
              {!isOwner && module.owner && (
                <span className="ml-2 inline-block px-1.5 py-0.5 bg-bg border border-border rounded text-[10px]">
                  Owned by {module.owner.name}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="relative">
              <button
                id={`module-menu-${module.id}`}
                onClick={() => setMenuOpen(!menuOpen)}
                className="btn-ghost p-1.5 rounded-lg"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 bg-panel border border-border rounded-xl shadow-card py-1 z-10 min-w-[140px]">
                  <button
                    onClick={() => { setMenuOpen(false); onDelete?.(module.id); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Appliance
                  </button>
                </div>
              )}
            </div>
          )}
          <Toggle
            id={`toggle-${module.id}`}
            checked={isOn}
            disabled={!canManage}
            onChange={handleToggle}
          />
        </div>
      </div>

      {/* Watts / Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOn && <span className="live-dot" />}
          <span className={`text-xs font-medium ${isOn ? 'text-accent' : 'text-muted'}`}>
            {isOn ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-text font-bold text-lg">
            {isOn ? module.watts.toFixed(1) : '0.0'}
          </span>
          <span className="text-muted text-xs ml-1">W</span>
        </div>
      </div>

      {/* Timer row */}
      <div className="border-t border-border pt-3">
        {module.timer_at ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Turns {isOn ? 'OFF' : 'ON'} in {formatTimer(module.timer_at)}</span>
            </div>
            {canManage && (
              <button
                onClick={handleClearTimer}
                className="text-xs text-muted hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        ) : showTimer && canManage ? (
          <form onSubmit={handleSetTimer} className="flex gap-2 animate-fade-in">
            <input
              type="number"
              value={timerMins}
              onChange={e => setTimerMins(e.target.value)}
              placeholder="Minutes"
              min="1"
              className="input text-xs py-1.5 flex-1"
            />
            <button type="submit" className="btn-primary text-xs py-1.5 px-3">Set</button>
            <button type="button" onClick={() => setShowTimer(false)} className="btn-ghost text-xs py-1.5 px-2">✕</button>
          </form>
        ) : (
          <button
            id={`timer-btn-${module.id}`}
            onClick={() => canManage && setShowTimer(true)}
            disabled={!canManage}
            className={`flex items-center gap-1.5 text-xs transition-colors ${canManage ? 'text-muted hover:text-text' : 'text-muted/50 cursor-not-allowed'}`}
          >
            <Timer className="w-3.5 h-3.5" />
            Set timer
          </button>
        )}
      </div>

      {errorMsg && (
        <AlertModal
          title="Toggle Error"
          message={errorMsg}
          onClose={() => setErrorMsg(null)}
        />
      )}
    </div>
  );
}

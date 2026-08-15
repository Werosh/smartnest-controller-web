import { useNavigate, useLocation } from 'react-router-dom';
import {
  Zap, LayoutDashboard, Cpu, BarChart2, Calendar,
  Bell, Clock, Settings, LogOut, ShieldCheck, Wifi
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'modules', label: 'Modules', icon: Cpu, path: '/modules' },
  { id: 'energy', label: 'Energy', icon: BarChart2, path: '/energy' },
  { id: 'schedules', label: 'Schedules', icon: Calendar, path: '/schedules' },
  { id: 'alerts', label: 'Alerts', icon: Bell, path: '/dashboard#alerts' },
  { id: 'history', label: 'History', icon: Clock, path: '/dashboard#history' },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';

  function isActive(path) {
    if (path === '/dashboard' && location.pathname === '/dashboard' && !location.hash) return true;
    if (path.includes('#')) return false;
    return location.pathname === path;
  }

  return (
    <aside className="w-60 bg-panel border-r border-border flex flex-col flex-shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-9 h-9 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-text font-bold text-sm leading-tight">SmartNest</p>
          <p className="text-muted text-xs">V1 Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ id, label, icon: Icon, path }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => navigate(path)}
            className={`nav-item w-full ${isActive(path) ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}

        {/* Admin-gated nav item */}
        {isAdmin && (
          <>
            <div className="border-t border-border my-2" />
            <button
              id="nav-admin"
              onClick={() => navigate('/admin')}
              className={`nav-item w-full ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              Admin
            </button>
          </>
        )}

        <div className="border-t border-border my-2" />

        <button id="nav-settings" className="nav-item w-full">
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </button>
      </nav>

      {/* Hub status card */}
      <div className="mx-3 mb-3 bg-bg border border-border rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="live-dot" />
          <span className="text-accent text-xs font-semibold">Central Hub</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted text-xs">
          <Wifi className="w-3 h-3" />
          <span>Online - Supabase Realtime</span>
        </div>
      </div>

      {/* User row */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {(profile?.name ?? 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text text-xs font-semibold truncate">{profile?.name ?? 'Home Owner'}</p>
            <span className={`badge text-xs ${isAdmin ? 'badge-green' : 'badge-muted'}`}>
              {profile?.role ?? 'user'}
            </span>
          </div>
          <button
            id="sign-out-btn"
            onClick={signOut}
            title="Sign out"
            className="text-muted hover:text-red-400 transition-colors p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

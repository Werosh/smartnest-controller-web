import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Cpu, BarChart2, Bell, Menu,
  Calendar, Clock, Settings, LogOut, ShieldCheck, X
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import SettingsModal from './SettingsModal';

const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'modules', label: 'Appliances', icon: Cpu, path: '/modules' },
  { id: 'energy', label: 'Energy', icon: BarChart2, path: '/energy' },
  { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts' },
];

const MORE_TABS = [
  { id: 'schedules', label: 'Schedules', icon: Calendar, path: '/schedules' },
  { id: 'history', label: 'History', icon: Clock, path: '/history' },
];

export default function BottomNav() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';
  const [showMore, setShowMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  function isActive(path) {
    if (path === '/dashboard' && location.pathname === '/dashboard' && !location.hash) return true;
    if (path.includes('#')) return false;
    return location.pathname === path;
  }

  function handleNav(path) {
    navigate(path);
    setShowMore(false);
  }

  const isMoreActive = MORE_TABS.some(tab => isActive(tab.path)) || (isAdmin && isActive('/admin'));

  return (
    <>
      {/* Bottom Sheet Overlay for "More" Menu */}
      {showMore && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* "More" Bottom Sheet */}
      <div className={`
        md:hidden fixed bottom-16 left-0 right-0 z-50 bg-panel border-t border-border rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]
        transform transition-transform duration-300 ease-out flex flex-col max-h-[80vh]
        ${showMore ? 'translate-y-0' : 'translate-y-full opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text">More Options</h3>
          <button onClick={() => setShowMore(false)} className="p-1 text-muted hover:text-text rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-2">
          {MORE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleNav(tab.path)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-colors font-medium text-sm
                ${isActive(tab.path) ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-border/60 hover:text-text'}
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}

          {isAdmin && (
            <>
              <div className="my-2 border-t border-border" />
              <button
                onClick={() => handleNav('/admin')}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-colors font-medium text-sm
                  ${isActive('/admin') ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-border/60 hover:text-text'}
                `}
              >
                <ShieldCheck className="w-5 h-5" />
                Admin Panel
              </button>
            </>
          )}

          <div className="my-2 border-t border-border" />
          
          <button
            onClick={() => {
              setShowMore(false);
              setShowSettings(true);
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-muted hover:bg-border/60 hover:text-text transition-colors font-medium text-sm"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
          
          <button
            onClick={() => {
              setShowMore(false);
              signOut();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-medium text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-panel border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16 px-1">
          {PRIMARY_TABS.map(tab => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => handleNav(tab.path)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors
                  ${active ? 'text-accent' : 'text-muted hover:text-text'}
                `}
              >
                <tab.icon className={`w-5 h-5 ${active ? 'fill-accent/20' : ''}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors
              ${showMore || isMoreActive ? 'text-accent' : 'text-muted hover:text-text'}
            `}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

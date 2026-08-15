import { useEffect, useState } from 'react';
import { Bell, Cloud, Sun } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/admin':     'Admin Panel',
};

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-muted text-xs font-medium tabular-nums">
      {now.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })}
    </span>
  );
}

export default function TopBar() {
  const { profile } = useAuth();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'SmartNest';

  return (
    <header className="h-16 border-b border-border bg-panel px-6 flex items-center justify-between flex-shrink-0">
      {/* Left: title + welcome */}
      <div>
        <h1 className="text-text font-bold text-base leading-tight">{title}</h1>
        <p className="text-muted text-xs">
          Welcome back, <span className="text-text font-medium">{profile?.name ?? 'Home Owner'}</span>
        </p>
      </div>

      {/* Right: weather chip, clock, notification bell */}
      <div className="flex items-center gap-4">
        {/* Weather chip */}
        <div className="hidden sm:flex items-center gap-2 bg-bg border border-border rounded-full px-3 py-1.5">
          <Sun className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-text text-xs font-medium">28°C</span>
          <span className="text-muted text-xs">Sunny</span>
        </div>

        {/* Clock */}
        <div className="hidden md:block">
          <Clock />
        </div>

        {/* Notification bell */}
        <button
          id="notification-bell"
          className="relative text-muted hover:text-text transition-colors p-1.5"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-accent rounded-full" />
        </button>
      </div>
    </header>
  );
}

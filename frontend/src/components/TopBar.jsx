import { useEffect, useState, useRef } from 'react';
import { Bell, Cloud, Sun, AlertTriangle, CloudRain, CloudSnow, CloudLightning, Moon } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

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

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather(lat, lon) {
      try {
        const [weatherRes, locRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`),
          fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
        ]);
        
        const weatherData = await weatherRes.json();
        const locData = await locRes.json();

        if (weatherData.current_weather) {
          setWeather(weatherData.current_weather);
          setLocationName(locData.city || locData.locality || locData.principalSubdivision || 'Unknown');
        }
      } catch (err) {
        console.error("Failed to fetch weather", err);
      }
      setLoading(false);
    }

    async function initLocation() {
      // Try IP Geolocation first for seamless experience
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            fetchWeather(data.latitude, data.longitude);
            return;
          }
        }
      } catch (e) {
        console.warn('IP Geolocation failed, trying browser geolocation...', e);
      }

      // Fallback to browser geolocation if IP fails
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
          () => fetchWeather(51.5085, -0.1257) // Fallback London
        );
      } else {
        fetchWeather(51.5085, -0.1257);
      }
    }

    initLocation();
  }, []);

  if (loading) {
    return (
      <div className="hidden sm:flex items-center gap-2 bg-bg border border-border rounded-full px-3 py-1.5 animate-pulse">
        <div className="w-3.5 h-3.5 bg-border rounded-full" />
        <div className="w-10 h-3 bg-border rounded" />
      </div>
    );
  }

  if (!weather) return null;

  const temp = Math.round(weather.temperature);
  const code = weather.weathercode;
  const isDay = weather.is_day === 1;

  let Icon = Cloud;
  let color = "text-muted";
  let label = "Cloudy";

  if (code === 0) {
    Icon = isDay ? Sun : Moon;
    color = isDay ? "text-yellow-400" : "text-blue-200";
    label = "Clear";
  } else if ([1, 2, 3].includes(code)) {
    Icon = isDay ? Sun : Cloud;
    color = isDay ? "text-yellow-200" : "text-gray-400";
    label = "Partly Cloudy";
  } else if ([51, 53, 55, 56, 57].includes(code)) {
    Icon = CloudRain;
    color = "text-blue-300";
    label = "Drizzle";
  } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    Icon = CloudRain;
    color = "text-blue-400";
    label = "Rain";
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    Icon = CloudSnow;
    color = "text-white";
    label = "Snow";
  } else if ([95, 96, 99].includes(code)) {
    Icon = CloudLightning;
    color = "text-purple-400";
    label = "Storm";
  }

  return (
    <div className="hidden sm:flex items-center gap-2 bg-bg border border-border rounded-full px-3 py-1.5 transition-all hover:border-accent/40" title="Local Weather">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-text text-xs font-medium">{temp}°C</span>
      <span className="text-muted text-xs flex items-center gap-1.5">
        <span>{label}</span>
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="font-medium text-text/80">{locationName}</span>
      </span>
    </div>
  );
}

export default function TopBar() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const title = PAGE_TITLES[location.pathname] ?? 'SmartNest';

  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent alerts
  useEffect(() => {
    async function fetchAlerts() {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .order('at', { ascending: false })
        .limit(5);
      if (data) {
        setAlerts(data);
        // Mock unread logic: assume all new ones are unread for now, up to 5
        setUnreadCount(data.length);
      }
    }

    fetchAlerts();

    const channel = supabase
      .channel('topbar-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        payload => {
          setAlerts(prev => [payload.new, ...prev].slice(0, 5));
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  function handleBellClick() {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setUnreadCount(0); // clear unread count when opening
    }
  }

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
        <WeatherWidget />

        {/* Clock */}
        <div className="hidden md:block">
          <Clock />
        </div>

        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="notification-bell"
            onClick={handleBellClick}
            className={`relative p-1.5 transition-colors rounded-lg ${showNotifications ? 'bg-border text-text' : 'text-muted hover:text-text hover:bg-border/50'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse-slow" />
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-panel border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up origin-top-right">
              <div className="flex items-center justify-between p-3 border-b border-border bg-bg/50">
                <span className="text-sm font-semibold text-text">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-accent font-medium">{unreadCount} new</span>
                )}
              </div>
              
              <div className="max-h-[300px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-muted text-sm flex flex-col items-center gap-2">
                    <Bell className="w-6 h-6 opacity-30" />
                    No new alerts
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} className="p-3 border-b border-border/50 hover:bg-bg/50 transition-colors flex gap-3 items-start">
                      <div className="p-1.5 bg-red-500/10 rounded-lg mt-0.5 flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text font-medium truncate">
                          {alert.module_name ?? alert.module_id ?? 'System Alert'}
                        </p>
                        <p className="text-xs text-muted line-clamp-2 mt-0.5">{alert.message}</p>
                        <p className="text-[10px] text-muted mt-1">{timeAgo(alert.at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-2 border-t border-border bg-bg/50">
                <button 
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/alerts');
                  }}
                  className="w-full py-1.5 text-xs text-muted hover:text-text hover:bg-border/50 transition-colors rounded-lg font-medium"
                >
                  View All Alerts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

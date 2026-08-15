import AlertsPanel from '../components/AlertsPanel';
import { Bell } from 'lucide-react';

export default function Alerts() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-6 h-6 text-muted" />
        <h2 className="text-xl font-semibold text-text">System Alerts</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
        
        <div className="card p-6 border-dashed border-border/50 text-muted flex flex-col justify-center items-center text-center gap-2">
          <Bell className="w-8 h-8 opacity-40 mb-2" />
          <p className="text-sm font-medium">Alerts Configuration</p>
          <p className="text-xs max-w-xs">
            Alerts are triggered automatically when the system detects unusual power consumption or offline devices.
            <br/><br/>
            Current spike threshold: <span className="text-accent">1200W</span>
          </p>
        </div>
      </div>
    </div>
  );
}

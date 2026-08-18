import { AlertTriangle, LifeBuoy, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Deactivated() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text">Account Deactivated</h1>
          <p className="text-muted text-sm leading-relaxed">
            Your account is currently deactivated. You do not have access to your dashboard or modules.
            Please contact our support team to reactivate your account.
          </p>
        </div>

        <div className="pt-6 border-t border-border flex flex-col gap-3">
          <button 
            onClick={() => window.location.href = 'mailto:support@smartnest.com'}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            <LifeBuoy className="w-4 h-4" />
            Contact Support
          </button>
          
          <button 
            onClick={() => supabase.auth.signOut()}
            className="btn-ghost w-full py-3 flex items-center justify-center gap-2 text-muted hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Zap, Eye, EyeOff, Home } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // AuthProvider's onAuthStateChange will pick this up and redirect
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || 'Home Owner' } },
        });
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password',
        });
        if (error) throw error;
        setSuccess('Password reset link sent! Check your email.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-slide-up relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-2xl border border-accent/20 mb-4">
            <Zap className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text">SmartNest</h1>
          <p className="text-muted text-sm mt-1">DIY Smart Home Controller V1</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {/* Tab toggle (hidden in forgot mode) */}
          {mode !== 'forgot' && (
            <div className="flex bg-bg rounded-xl p-1 mb-6 gap-1">
              <button
                id="signin-tab"
                onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'signin'
                    ? 'bg-accent text-white shadow-glow-sm'
                    : 'text-muted hover:text-text'
                  }`}
              >
                Sign In
              </button>
              <button
                id="signup-tab"
                onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'signup'
                    ? 'bg-accent text-white shadow-glow-sm'
                    : 'text-muted hover:text-text'
                  }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-text mb-1">Reset Password</h2>
              <p className="text-sm text-muted">Enter your email and we will send you a reset link.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    id="name-input"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Home Owner"
                    className="input pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Email Address
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="input"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-muted">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                      className="text-xs text-accent hover:text-accent2 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-accent text-sm">
                {success}
              </div>
            )}

            <button
              id="submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-2"
            >
              {loading
                ? (mode === 'signin' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending link...')
                : (mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link')
              }
            </button>
          </form>

          {mode === 'signin' && (
            <p className="text-center text-xs text-muted mt-4">
              First time?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-accent hover:text-accent2 transition-colors font-medium"
              >
                Create an account
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p className="text-center text-xs text-muted mt-4">
              Remembered your password?{' '}
              <button
                onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                className="text-accent hover:text-accent2 transition-colors font-medium"
              >
                Back to sign in
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">
          SmartNest V1 - University IoT Project
        </p>
      </div>
    </div>
  );
}

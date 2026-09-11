'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock, Sparkles, Receipt } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClient();

  const [mode, setMode]       = useState<'signin' | 'magic'>('signin');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState('');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else window.location.href = '/';
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://claims.skyhealthtech.ca/auth/callback' },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Magic link sent to ${email} — check your inbox.`);
  }

  async function handleGoogle() {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://claims.skyhealthtech.ca/auth/callback' },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(124,92,191,0.12)', padding: '40px 36px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c5cbf,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', letterSpacing: '-0.02em' }}>Sky Claims</div>
            <div style={{ fontSize: 11, color: '#7c5cbf', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>MSP Billing</div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 6, letterSpacing: '-0.02em' }}>
          {mode === 'signin' ? 'Welcome back' : 'Sign in with magic link'}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 28, lineHeight: 1.5 }}>
          {mode === 'signin' ? 'Sign in to your Sky Claims account' : "We'll email you a secure, one-click link"}
        </p>

        {done ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px 16px', color: '#166534', fontSize: 13, lineHeight: 1.5 }}>
            {done}
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af' }} />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="you@practice.ca" autoComplete="email"
                      style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11, border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af' }} />
                    <input
                      type="password" value={password} onChange={e => setPass(e.target.value)} required
                      placeholder="••••••••" autoComplete="current-password"
                      style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11, border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  style={{ background: 'linear-gradient(135deg,#7c5cbf,#a78bfa)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <><Lock style={{ width: 14, height: 14 }} /> Sign in</>}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#d1d5db', fontSize: 12 }}>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />or<div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>

                <button type="button" onClick={handleGoogle} disabled={loading}
                  style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 20px', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="17" height="17" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>

                <button type="button" onClick={() => setMode('magic')} disabled={loading}
                  style={{ background: '#f5f3ff', color: '#6d28d9', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '11px 20px', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Sparkles style={{ width: 14, height: 14 }} /> Send magic link instead
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagic} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af' }} />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="you@practice.ca" autoComplete="email"
                      style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11, border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  style={{ background: 'linear-gradient(135deg,#7c5cbf,#a78bfa)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? <Loader2 style={{ width: 16, height: 16 }} /> : <><Sparkles style={{ width: 14, height: 14 }} /> Send magic link</>}
                </button>
                <button type="button" onClick={() => setMode('signin')}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
                  ← Back to password sign in
                </button>
              </form>
            )}
          </>
        )}

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          Need Sky Chamber EHR?{' '}
          <a href="https://app.skyhealthtech.ca" style={{ color: '#7c5cbf', textDecoration: 'none', fontWeight: 500 }}>Sign in here →</a>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock, Sparkles, Receipt, UserPlus, Eye, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

const CALLBACK = 'https://claims.skyhealthtech.ca/auth/callback';

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
  border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 14,
  outline: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff',
};
const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg,#7c5cbf,#a78bfa)', color: '#fff',
  border: 'none', borderRadius: 12, padding: '13px 20px',
  fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', color: '#e2d9f3',
  border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 12,
  padding: '11px 20px', fontWeight: 500, fontSize: 13, cursor: 'pointer', width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const btnGhost: React.CSSProperties = {
  background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
  fontSize: 13, cursor: 'pointer', textAlign: 'center', width: '100%', padding: '4px 0',
};

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function LeftPanel() {
  return (
    <div style={{
      display: 'none',
      flexDirection: 'column', justifyContent: 'space-between',
      padding: 40, width: 400, flexShrink: 0, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, #2d1b69 0%, #4c2f9e 45%, #7c5cbf 100%)',
    }} className="left-panel">
      <div style={{ position: 'relative', zIndex: 10 }}>
        <a href="https://skyhealthtech.ca" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 48 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: '-0.02em' }}>Sky Claims</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>MSP Billing</div>
          </div>
        </a>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 12 }}>
          BC MSP billing,<br />done in seconds.
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: 36 }}>
          Submit Teleplan claims, verify eligibility, and track remittances — all in one place.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: Zap, text: 'Submit MSP claims in under 60 seconds' },
            { icon: ShieldCheck, text: 'Real-time eligibility verification' },
            { icon: BarChart3, text: 'Remittance tracking & reconciliation' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 16, height: 16, color: '#d8b4fe' }} />
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
        Part of the <a href="https://skyhealthtech.ca" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Sky Health Technologies</a> suite
      </div>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: 60, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );
}

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode]       = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [confirm, setConfirm] = useState('');
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

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: CALLBACK },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Check your inbox at ${email} — click the link to activate your account, then sign in.`);
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: CALLBACK },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Magic link sent to ${email} — check your inbox.`);
  }

  async function handleGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: CALLBACK },
    });
    if (error) setError(error.message);
  }

  const titles = { signin: 'Welcome back', signup: 'Create your account', magic: 'Magic link sign in' };
  const subs   = { signin: 'Sign in to Sky Claims', signup: 'Start your 30-day free trial', magic: "We'll email you a secure, one-click link" };

  return (
    <>
      <style>{`
        @media (min-width: 1024px) { .left-panel { display: flex !important; } }
        input::placeholder { color: rgba(255,255,255,0.35); }
        input { color: #fff; }
      `}</style>
      <div style={{ minHeight: '100vh', display: 'flex', background: '#1a0f3c' }}>
        <LeftPanel />

        {/* Right panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 400 }}>

            {/* Mobile logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }} className="mobile-logo">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c5cbf,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.02em' }}>Sky Claims</div>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.02em' }}>{titles[mode]}</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28, lineHeight: 1.5 }}>{subs[mode]}</p>

            {done ? (
              <div style={{ background: 'rgba(134,239,172,0.15)', border: '1px solid rgba(134,239,172,0.3)', borderRadius: 12, padding: '16px', color: '#86efac', fontSize: 13, lineHeight: 1.6 }}>
                {done}
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ background: 'rgba(252,165,165,0.15)', border: '1px solid rgba(252,165,165,0.3)', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                {/* Sign In */}
                {mode === 'signin' && (
                  <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.4)' }} />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@practice.ca" autoComplete="email" style={inputStyle} />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.4)' }} />
                      <input type="password" value={password} onChange={e => setPass(e.target.value)} required placeholder="••••••••" autoComplete="current-password" style={inputStyle} />
                    </div>
                    <button type="submit" disabled={loading} style={btnPrimary}>
                      {loading ? <Loader2 style={{ width: 16, height: 16 }} /> : <><Lock style={{ width: 14, height: 14 }} /> Sign in</>}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} /> or <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    <button type="button" onClick={handleGoogle} style={btnSecondary}><GoogleIcon /> Continue with Google</button>
                    <button type="button" onClick={() => setMode('magic')} style={{ ...btnSecondary, background: 'rgba(167,139,250,0.15)', border: '1.5px solid rgba(167,139,250,0.3)', color: '#c4b5fd' }}>
                      <Sparkles style={{ width: 14, height: 14 }} /> Send magic link instead
                    </button>
                    <button type="button" onClick={() => setMode('signup')} style={btnGhost}>
                      No account? <span style={{ color: '#c4b5fd', fontWeight: 600 }}>Sign up free</span>
                    </button>
                  </form>
                )}

                {/* Sign Up */}
                {mode === 'signup' && (
                  <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.4)' }} />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@practice.ca" autoComplete="email" style={inputStyle} />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.4)' }} />
                      <input type="password" value={password} onChange={e => setPass(e.target.value)} required placeholder="Password (8+ characters)" autoComplete="new-password" style={inputStyle} />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.4)' }} />
                      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Confirm password" autoComplete="new-password" style={inputStyle} />
                    </div>
                    <button type="submit" disabled={loading} style={btnPrimary}>
                      {loading ? <Loader2 style={{ width: 16, height: 16 }} /> : <><UserPlus style={{ width: 14, height: 14 }} /> Create account</>}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} /> or <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    <button type="button" onClick={handleGoogle} style={btnSecondary}><GoogleIcon /> Sign up with Google</button>
                    <button type="button" onClick={() => setMode('signin')} style={btnGhost}>
                      Already have an account? <span style={{ color: '#c4b5fd', fontWeight: 600 }}>Sign in</span>
                    </button>
                  </form>
                )}

                {/* Magic link */}
                {mode === 'magic' && (
                  <form onSubmit={handleMagic} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.4)' }} />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@practice.ca" autoComplete="email" style={inputStyle} />
                    </div>
                    <button type="submit" disabled={loading} style={btnPrimary}>
                      {loading ? <Loader2 style={{ width: 16, height: 16 }} /> : <><Sparkles style={{ width: 14, height: 14 }} /> Send magic link</>}
                    </button>
                    <button type="button" onClick={() => setMode('signin')} style={btnGhost}>← Back to sign in</button>
                  </form>
                )}
              </>
            )}

            <p style={{ marginTop: 28, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Need Sky Chamber EHR?{' '}
              <a href="https://app.skyhealthtech.ca" style={{ color: '#c4b5fd', textDecoration: 'none' }}>Sign in here →</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

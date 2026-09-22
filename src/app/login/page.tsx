'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Eye, EyeOff, Mail, Lock, Loader2, Sparkles, ArrowLeft,
  ShieldCheck, CheckCircle2, Receipt, BarChart3, Zap,
} from 'lucide-react';

type Mode = 'signin' | 'signup' | 'magic' | 'forgot';
// Dynamic callback — works in dev (localhost) and production
const CALLBACK = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback`
  : 'https://claims.skyhealthtech.ca/auth/callback';
const ACCENT   = '#7c3aed';

// ── Google icon ───────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// ── Left panel ─────────────────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between p-10 w-[440px] shrink-0 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #2e1065 0%, #4c1d95 45%, #7c3aed 100%)' }}>
      <div className="relative z-10">
        <a href="https://skyhealthtech.ca" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 48 }}>
          <div style={{ height: 40, width: 40, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-claims.svg" alt="Sky Claims" width={40} height={40} style={{ display: 'block' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>Sky Claims</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>Health Billing</div>
          </div>
        </a>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Canadian health billing,<br />done right.
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.65, marginBottom: 32 }}>
          Submit MSP, OHIP, AHCIP, and all provincial plans — with AI claim scrubbing, ERA matching, and real-time remittance reconciliation.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { Icon: Zap,       title: 'Submit in under 60 seconds',  body: 'Claims pre-filled from Sky Chamber encounters.' },
            { Icon: BarChart3, title: 'All provinces supported',      body: 'MSP, OHIP, AHCIP and every provincial plan.' },
            { Icon: Receipt,   title: 'ERA matching & reconciliation', body: 'Payments posted automatically. Denials resubmitted.' },
          ].map(({ Icon, title, body }) => (
            <div key={title} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Icon style={{ width: 15, height: 15, color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['PIPEDA & PHIPA compliant', 'Canadian data residency', 'Integrates with Sky Chamber EHR'].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#fff' }}>
            <CheckCircle2 style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.8)', flexShrink: 0 }} />
            {t}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: 60, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );
}

// ── Input helpers ──────────────────────────────────────────────────────────────
const inputBase = { background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#111827' } as const;
function focusIn(e: React.FocusEvent<HTMLInputElement>)  { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(124,58,237,0.1)`; }
function focusOut(e: React.FocusEvent<HTMLInputElement>) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }

function Field({ label, type = 'text', value, onChange, placeholder, icon: Icon, autoComplete }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: React.ElementType; autoComplete?: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af', pointerEvents: 'none' }} />}
        <input type={type} required value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete} style={inputBase}
          className={`w-full rounded-xl ${Icon ? 'pl-9' : 'pl-4'} pr-4 py-2.5 text-[13px] placeholder:text-gray-400 focus:outline-none transition-all`}
          onFocus={focusIn} onBlur={focusOut} />
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, autoComplete, extra }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; extra?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>
        {extra}
      </div>
      <div style={{ position: 'relative' }}>
        <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af', pointerEvents: 'none' }} />
        <input type={show ? 'text' : 'password'} required value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'} autoComplete={autoComplete ?? 'current-password'} style={inputBase}
          className="w-full rounded-xl pl-9 pr-10 py-2.5 text-[13px] placeholder:text-gray-400 focus:outline-none transition-all"
          onFocus={focusIn} onBlur={focusOut} />
        <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
          {show ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      <span style={{ fontSize: 11, color: '#9ca3af' }}>or</span>
      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
    </div>
  );
}

// ── Auth form ──────────────────────────────────────────────────────────────────
function AuthForm({ initialMode }: { initialMode: Mode }) {
  const supabase = createClient();
  const [mode, setMode]       = useState<Mode>(initialMode);
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoad]  = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState<string | null>(null);

  const btnPrimary: React.CSSProperties = {
    background: `linear-gradient(135deg, ${ACCENT} 0%, #a78bfa 100%)`,
    color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px',
    fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
  const btnOutline: React.CSSProperties = {
    background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb',
    borderRadius: 12, padding: '11px 20px', fontWeight: 500, fontSize: 13,
    cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  const errorBox = (
    <p style={{ fontSize: 12, borderRadius: 10, padding: '8px 12px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', margin: 0 }}>
      {error}
    </p>
  );

  async function handleGoogle() {
    setGLoad(true); setError('');
    const redirectTo = mode === 'signup' ? `${CALLBACK}?next=/onboarding` : CALLBACK;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) { setError(error.message); setGLoad(false); }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else window.location.href = '/';
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${CALLBACK}?next=/onboarding` } });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Check your inbox at ${email} — click the confirmation link to activate your account.`);
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: CALLBACK } });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Magic link sent to ${email}. Check your inbox.`);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${CALLBACK}?next=/settings` });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Reset link sent to ${email}.`);
  }

  if (done) return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ede9fe', border: '1px solid #c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <CheckCircle2 style={{ width: 24, height: 24, color: ACCENT }} />
      </div>
      <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#111827' }}>Check your email</h2>
      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{done}</p>
      <button onClick={() => { setDone(null); setMode('signin'); }} style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: ACCENT, margin: '20px auto 0' }}>
        <ArrowLeft style={{ width: 13, height: 13 }} /> Back to sign in
      </button>
    </div>
  );

  if (mode === 'magic') return (
    <form onSubmit={handleMagic} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>We'll email you a secure, one-click sign-in link.</p>
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.ca" icon={Mail} autoComplete="email" />
      {error && errorBox}
      <button type="submit" disabled={loading} style={btnPrimary}>
        {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <><Sparkles style={{ width: 14, height: 14 }} /> Send magic link</>}
      </button>
      <button type="button" onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280', justifyContent: 'center' }}>
        <ArrowLeft style={{ width: 13, height: 13 }} /> Back to sign in
      </button>
    </form>
  );

  if (mode === 'forgot') return (
    <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Enter your email and we'll send a reset link.</p>
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.ca" icon={Mail} autoComplete="email" />
      {error && errorBox}
      <button type="submit" disabled={loading} style={btnPrimary}>
        {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <><Mail style={{ width: 14, height: 14 }} /> Send reset link</>}
      </button>
      <button type="button" onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280', justifyContent: 'center' }}>
        <ArrowLeft style={{ width: 13, height: 13 }} /> Back to sign in
      </button>
    </form>
  );

  // Sign in / Sign up — all options visible upfront
  if (mode === 'signin') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button type="button" onClick={handleGoogle} disabled={gLoading} style={btnOutline}>
        {gLoading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />}
        Continue with Google
      </button>
      <Divider />
      <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.ca" icon={Mail} autoComplete="email" />
        <PasswordField label="Password" value={password} onChange={setPass} autoComplete="current-password"
          extra={<button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: ACCENT }}> Forgot password?</button>}
        />
        {error && errorBox}
        <button type="submit" disabled={loading} style={btnPrimary}>
          {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <><Lock style={{ width: 14, height: 14 }} /> Sign in</>}
        </button>
      </form>
      <button type="button" onClick={() => setMode('magic')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Sparkles style={{ width: 12, height: 12, color: ACCENT }} /> Sign in with magic link instead
      </button>
    </div>
  );

  // Signup
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button type="button" onClick={handleGoogle} disabled={gLoading} style={btnOutline}>
        {gLoading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />}
        Sign up with Google
      </button>
      <Divider />
      <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.ca" icon={Mail} autoComplete="email" />
        <PasswordField label="Password" value={password} onChange={setPass} placeholder="Min. 8 characters" autoComplete="new-password" />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} placeholder="Re-enter password" autoComplete="new-password" />
        {error && errorBox}
        <button type="submit" disabled={loading} style={btnPrimary}>
          {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <>Create account</>}
        </button>
        <p style={{ fontSize: 11, textAlign: 'center', color: '#9ca3af', margin: 0 }}>
          By signing up you agree to our{' '}
          <a href="https://skyhealthtech.ca/terms" target="_blank" rel="noopener" style={{ color: ACCENT }}>Terms</a>
          {' '}and{' '}
          <a href="https://skyhealthtech.ca/privacy" target="_blank" rel="noopener" style={{ color: ACCENT }}>Privacy Policy</a>.
        </p>
      </form>
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────────
const MODE_META: Record<Mode, { title: string; sub: string }> = {
  signin: { title: 'Welcome back',            sub: 'Sign in to your Sky Claims account' },
  signup: { title: 'Start your 30-day trial', sub: 'No credit card required · Set up in minutes' },
  magic:  { title: 'Magic link sign in',       sub: "We'll email you a secure, one-click link" },
  forgot: { title: 'Reset password',           sub: "We'll send a reset link to your email" },
};

function LoginPageInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>((searchParams.get('mode') as Mode) ?? 'signin');
  const meta = MODE_META[mode];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f5f3ff', fontFamily: 'Inter, sans-serif' }}>
      <LeftPanel />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Mobile logo */}
          <a href="https://skyhealthtech.ca" className="flex lg:hidden items-center gap-2.5 justify-center" style={{ textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-claims.svg" alt="Sky Claims" width={36} height={36} style={{ display: 'block' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Sky Claims</span>
          </a>

          {/* Header */}
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: '#111827', margin: 0 }}>{meta.title}</h2>
            <p style={{ fontSize: 13, marginTop: 4, color: '#6b7280', marginBottom: 0 }}>{meta.sub}</p>
          </div>

          {/* Tab switcher */}
          {(mode === 'signin' || mode === 'signup') && (
            <div style={{ display: 'flex', borderRadius: 12, padding: 4, background: '#e5e7eb' }}>
              {(['signin', 'signup'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, fontSize: 13, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.15s',
                  ...(mode === m
                    ? { background: '#fff', color: ACCENT, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { background: 'transparent', color: '#6b7280' }),
                }}>
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {/* Card */}
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)' }}>
            <AuthForm key={mode} initialMode={mode} />
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', margin: 0 }}>
            <ShieldCheck style={{ width: 11, height: 11, display: 'inline', marginRight: 3, color: ACCENT, verticalAlign: 'middle' }} />
            Encrypted · PIPEDA &amp; PHIPA compliant · Canadian data residency
          </p>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', margin: 0 }}>
            Need Sky Chamber EHR?{' '}
            <a href="https://app.skyhealthtech.ca" style={{ color: ACCENT, fontWeight: 500, textDecoration: 'none' }}>Sign in here →</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}

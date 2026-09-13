'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Eye, EyeOff, Mail, Lock, Loader2, Sparkles, ArrowLeft,
  ShieldCheck, CheckCircle2, Receipt, BarChart3, Zap,
} from 'lucide-react';

type Mode = 'signin' | 'signup' | 'magic' | 'forgot';
const CALLBACK = 'https://claims.skyhealthtech.ca/auth/callback';

// ── Google icon ───────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
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
    <div
      className="hidden lg:flex flex-col justify-between p-10 w-[440px] shrink-0 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #2e1065 0%, #4c1d95 45%, #7c3aed 100%)' }}
    >
      <div className="relative z-10">
        <a href="https://skyhealthtech.ca" className="mb-12" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <Receipt className="w-5 h-5" style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>Sky Claims</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>Health Billing</div>
          </div>
        </a>

        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Canadian health billing,<br />done right.
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.65 }}>
          Submit MSP, OHIP, AHCIP, and provincial health claims — with AI claim scrubbing, ERA matching, and real-time remittance reconciliation.
        </p>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { Icon: Zap,       title: 'Submit claims in under 60 seconds',    body: 'Claims pre-populated from Sky Chamber encounters. One click to submit.' },
            { Icon: BarChart3, title: 'National coverage',                    body: 'BC MSP, Ontario OHIP, Alberta AHCIP, and every provincial plan — one platform.' },
            { Icon: Receipt,   title: 'ERA matching & reconciliation',         body: 'Payments posted automatically. Denials caught, categorised, and resubmitted.' },
          ].map(({ Icon, title, body }) => (
            <div key={title} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ height: 36, width: 36, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Icon style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          'PIPEDA & PHIPA compliant',
          'Canadian data residency — no data leaves Canada',
          'Integrates directly with Sky Chamber EHR',
        ].map((t) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#fff' }}>
            <CheckCircle2 style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.85)', flexShrink: 0 }} />
            {t}
          </div>
        ))}
      </div>

      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 60, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', zIndex: 0 }} />
    </div>
  );
}

// ── Shared input styles ────────────────────────────────────────────────────────
const inputBase = {
  background: '#f9fafb',
  border: '1.5px solid #e5e7eb',
  color: '#111827',
} as const;

function focusIn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#7c3aed';
  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.1)';
}
function focusOut(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#e5e7eb';
  e.currentTarget.style.boxShadow   = 'none';
}

// ── Plain field ────────────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, icon: Icon, autoComplete }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: any; autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#374151' }}>{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#9ca3af' }} />}
        <input
          type={type} required value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete}
          style={inputBase}
          className={`w-full rounded-xl ${Icon ? 'pl-9' : 'pl-4'} pr-4 py-2.5 text-[13px] placeholder:text-gray-400 focus:outline-none transition-all`}
          onFocus={focusIn} onBlur={focusOut}
        />
      </div>
    </div>
  );
}

// ── Password field with show/hide toggle ───────────────────────────────────────
function PasswordField({ label, value, onChange, placeholder, autoComplete, extra }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string;
  extra?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-semibold" style={{ color: '#374151' }}>{label}</label>
        {extra}
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#9ca3af' }} />
        <input
          type={show ? 'text' : 'password'} required value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'} autoComplete={autoComplete ?? 'current-password'}
          style={inputBase}
          className="w-full rounded-xl pl-9 pr-10 py-2.5 text-[13px] placeholder:text-gray-400 focus:outline-none transition-all"
          onFocus={focusIn} onBlur={focusOut}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: '#9ca3af' }}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Social button ──────────────────────────────────────────────────────────────
function SocialButton({ onClick, loading, icon, label, dark }: {
  onClick: () => void; loading: boolean;
  icon: React.ReactNode; label: string; dark?: boolean;
}) {
  const bg    = dark ? '#000'     : '#fff';
  const bgHov = dark ? '#1a1a1a' : '#f9fafb';
  const color = dark ? '#fff'     : '#374151';
  return (
    <button
      type="button" onClick={onClick} disabled={loading}
      style={{
        background: bg, color, border: dark ? '1.5px solid #000' : '1.5px solid #e5e7eb',
        borderRadius: '12px', padding: '11px 20px', fontWeight: 500, fontSize: '13px',
        cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px', transition: 'background 0.15s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = bgHov)}
      onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="relative flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
      <span className="text-[11px]" style={{ color: '#9ca3af' }}>or</span>
      <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
    </div>
  );
}

// ── Auth form ──────────────────────────────────────────────────────────────────
function AuthForm({ initialMode: initMode }: { initialMode?: Mode }) {
  const supabase = createClient();
  const [mode, setMode]         = useState<Mode>(initMode ?? 'signin');
  const [email, setEmail]       = useState('');
  const [password, setPass]     = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [emailExp, setEmailExp] = useState(initMode === 'signup');
  const [error, setError]       = useState('');
  const [done, setDone]         = useState<string | null>(null);

  const accent = '#7c3aed';

  const btnPrimary = {
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    color: '#fff', border: 'none', borderRadius: '12px',
    padding: '11px 20px', fontWeight: 600, fontSize: '14px',
    cursor: 'pointer', width: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'opacity 0.15s',
  } as const;

  const errorBox = (
    <p className="text-[12px] rounded-xl px-3 py-2" style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' }}>
      {error}
    </p>
  );

  async function handleGoogle() {
    setGLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: CALLBACK } });
    if (error) { setError(error.message); setGLoading(false); }
  }

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
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: CALLBACK } });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Account created! We sent a confirmation link to ${email}. Click it to activate, then sign in.`);
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: CALLBACK } });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Magic link sent to ${email}. Check your inbox.`);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${CALLBACK}?next=/settings` });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(`Password reset link sent to ${email}.`);
  }

  if (done) return (
    <div className="text-center py-4">
      <div className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#ede9fe', border: '1px solid #c4b5fd' }}>
        <CheckCircle2 className="w-6 h-6" style={{ color: accent }} />
      </div>
      <h2 className="font-bold text-[17px] mb-2" style={{ color: '#111827' }}>Check your email</h2>
      <p className="text-[13px] leading-relaxed" style={{ color: '#6b7280' }}>{done}</p>
      <button onClick={() => { setDone(null); setMode('signin'); setEmailExp(false); }}
        className="mt-5 text-[12px] flex items-center gap-1 mx-auto" style={{ color: accent }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </button>
    </div>
  );

  // Social buttons block
  const socialBlock = (
    <div className="space-y-2.5">
      <SocialButton onClick={handleGoogle} loading={gLoading} icon={<GoogleIcon />} label="Continue with Google" />
      <button
        type="button"
        onClick={() => setEmailExp(true)}
        style={{
          background: '#f3f4f6', color: '#374151', border: '1.5px solid #e5e7eb',
          borderRadius: '12px', padding: '11px 20px', fontWeight: 500, fontSize: '13px',
          cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#e9eaec')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#f3f4f6')}
      >
        <Mail className="w-4 h-4" style={{ color: '#6b7280' }} /> Continue with email
      </button>
    </div>
  );

  if (mode === 'signin') return (
    <div className="space-y-4">
      {!emailExp ? socialBlock : (
        <form onSubmit={handleSignIn} className="space-y-4">
          <button type="button" onClick={() => setEmailExp(false)}
            className="flex items-center gap-1 text-[12px]" style={{ color: '#9ca3af' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Other sign-in options
          </button>
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@practice.ca" icon={Mail} autoComplete="email" />
          <PasswordField
            label="Password" value={password} onChange={setPass} autoComplete="current-password"
            extra={
              <button type="button" onClick={() => setMode('forgot')} className="text-[12px] font-medium" style={{ color: accent }}>
                Forgot password?
              </button>
            }
          />
          {error && errorBox}
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-3.5 h-3.5" /> Sign in</>}
          </button>
          <Divider />
          <button type="button" onClick={() => setMode('magic')} style={{
            background: '#f3f4f6', color: '#374151', border: '1.5px solid #e5e7eb',
            borderRadius: '12px', padding: '11px 20px', fontWeight: 500, fontSize: '13px',
            cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} /> Sign in with magic link
          </button>
        </form>
      )}
    </div>
  );

  if (mode === 'signup') return (
    <div className="space-y-4">
      {!emailExp ? socialBlock : (
        <form onSubmit={handleSignUp} className="space-y-4">
          <button type="button" onClick={() => setEmailExp(false)}
            className="flex items-center gap-1 text-[12px]" style={{ color: '#9ca3af' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Other sign-up options
          </button>
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.ca" icon={Mail} autoComplete="email" />
          <PasswordField label="Password" value={password} onChange={setPass} placeholder="Min. 8 characters" autoComplete="new-password" />
          <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} placeholder="Re-enter password" autoComplete="new-password" />
          {error && errorBox}
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create account</>}
          </button>
          <p className="text-[11px] text-center leading-relaxed" style={{ color: '#9ca3af' }}>
            By signing up you agree to our{' '}
            <a href="https://skyhealthtech.ca/terms" target="_blank" rel="noopener" style={{ color: accent }}>Terms</a>
            {' '}and{' '}
            <a href="https://skyhealthtech.ca/privacy" target="_blank" rel="noopener" style={{ color: accent }}>Privacy Policy</a>.
          </p>
        </form>
      )}
    </div>
  );

  if (mode === 'magic') return (
    <form onSubmit={handleMagic} className="space-y-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.ca" icon={Mail} autoComplete="email" />
      {error && errorBox}
      <button type="submit" disabled={loading} style={btnPrimary}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Send magic link</>}
      </button>
      <button type="button" onClick={() => setMode('signin')} className="flex items-center gap-1 text-[12px] mx-auto" style={{ color: '#6b7280' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to password sign in
      </button>
    </form>
  );

  return (
    <form onSubmit={handleForgot} className="space-y-4">
      <p className="text-[13px]" style={{ color: '#6b7280' }}>Enter your email and we'll send a reset link.</p>
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@clinic.ca" icon={Mail} autoComplete="email" />
      {error && errorBox}
      <button type="submit" disabled={loading} style={btnPrimary}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-3.5 h-3.5" /> Send reset link</>}
      </button>
      <button type="button" onClick={() => setMode('signin')} className="flex items-center gap-1 text-[12px] mx-auto" style={{ color: '#6b7280' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </button>
    </form>
  );
}

// ── Mode meta ──────────────────────────────────────────────────────────────────
const MODE_META: Record<Mode, { title: string; sub: string }> = {
  signin: { title: 'Welcome back',            sub: 'Sign in to your Sky Claims account' },
  signup: { title: 'Start your 30-day trial', sub: 'No credit card required · Set up in minutes' },
  magic:  { title: 'Magic link sign in',       sub: "We'll email you a secure, one-click link" },
  forgot: { title: 'Reset password',           sub: "We'll send a reset link to your email" },
};

// ── Page shell ─────────────────────────────────────────────────────────────────
function LoginPageInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>((searchParams.get('mode') as Mode) ?? 'signin');
  const meta = MODE_META[mode];
  const accent = '#7c3aed';

  return (
    <div className="min-h-screen flex" style={{ background: '#f5f3ff', fontFamily: 'Inter, sans-serif' }}>
      <LeftPanel />

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[400px] space-y-6">

          {/* Mobile logo */}
          <a href="https://skyhealthtech.ca" className="flex lg:hidden items-center gap-2.5 justify-center mb-2" style={{ textDecoration: 'none' }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[15px]" style={{ color: '#111827' }}>Sky Claims</span>
          </a>

          {/* Header */}
          <div>
            <h2 className="font-bold text-[26px] tracking-tight" style={{ color: '#111827' }}>{meta.title}</h2>
            <p className="text-[13px] mt-1" style={{ color: '#6b7280' }}>{meta.sub}</p>
          </div>

          {/* Tab switcher */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="flex rounded-xl p-1" style={{ background: '#e5e7eb' }}>
              {(['signin', 'signup'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 text-[13px] py-2 rounded-lg transition-all font-semibold"
                  style={mode === m
                    ? { background: '#fff', color: accent, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { background: 'transparent', color: '#6b7280' }
                  }>
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {/* Form card */}
          <div className="rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)' }}>
            <AuthForm key={mode} initialMode={mode} />
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] leading-relaxed" style={{ color: '#9ca3af' }}>
            <ShieldCheck className="w-3 h-3 inline mb-0.5 mr-1" style={{ color: '#7c3aed' }} />
            Encrypted · PIPEDA &amp; PHIPA compliant · Canadian data residency
          </p>
          <p className="text-center text-[11px]" style={{ color: '#9ca3af' }}>
            Need Sky Chamber EHR?{' '}
            <a href="https://app.skyhealthtech.ca" style={{ color: accent, textDecoration: 'none', fontWeight: 500 }}>Sign in here →</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

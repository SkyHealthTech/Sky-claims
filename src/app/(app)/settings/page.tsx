'use client';
import { useState } from 'react';
import { Shield, User, Building2, CheckCircle2, AlertTriangle, Eye, EyeOff, Save, CreditCard, Lock, Plug, Copy, RefreshCw, Globe, Zap, ExternalLink, Key, Calendar } from 'lucide-react';

type Tab = 'practice' | 'provider' | 'teleplan' | 'integrations' | 'billing' | 'security' | 'compliance';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'practice',     label: 'Practice',      icon: Building2 },
  { id: 'provider',     label: 'Provider',       icon: User },
  { id: 'teleplan',     label: 'Billing Plans',  icon: Shield },
  { id: 'integrations', label: 'Integrations',   icon: Plug },
  { id: 'billing',      label: 'Billing',        icon: CreditCard },
  { id: 'security',     label: 'Security',       icon: Lock },
  { id: 'compliance',   label: 'Compliance',     icon: CheckCircle2 },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('practice');

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Tabs */}
      <div className="tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />{label}
          </button>
        ))}
      </div>

      {tab === 'practice'     && <PracticeTab />}
      {tab === 'provider'     && <ProviderTab />}
      {tab === 'teleplan'     && <TeleplanTab />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'billing'      && <BillingTab />}
      {tab === 'security'     && <SecurityTab />}
      {tab === 'compliance'   && <ComplianceTab />}
    </div>
  );
}

/* ── Practice ── */
function PracticeTab() {
  const [saved, setSaved] = useState(false);
  function save(e: React.FormEvent) { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  return (
    <form onSubmit={save}>
      <div className="card cp" style={{ marginBottom: 16 }}>
        <div className="ct" style={{ marginBottom: 16 }}>Practice Information</div>
        <div className="fg">
          <div className="field">
            <label>Practice Name</label>
            <input defaultValue="Sky Eye Care" />
          </div>
          <div className="fg fg2">
            <div className="field"><label>Province</label><select defaultValue="BC"><option>BC</option><option>ON</option><option>AB</option><option>QC</option></select></div>
            <div className="field"><label>City</label><input defaultValue="Vancouver" /></div>
          </div>
          <div className="field"><label>Street Address</label><input defaultValue="1234 West Georgia St" /></div>
          <div className="fg fg2">
            <div className="field"><label>Postal Code</label><input defaultValue="V6E 3C9" /></div>
            <div className="field"><label>Phone</label><input defaultValue="(604) 555-0100" /></div>
          </div>
          <div className="field"><label>Business Number (CRA)</label><input placeholder="123456789 RT0001" /></div>
          <div className="field"><label>Practice Email</label><input defaultValue="Dr.ekeoba@gmail.com" type="email" /></div>
        </div>
      </div>
      <button type="submit" className="btn btn-p">
        {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save Practice</>}
      </button>
    </form>
  );
}

/* ── Provider ── */
function ProviderTab() {
  const [saved, setSaved] = useState(false);
  function save(e: React.FormEvent) { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  return (
    <form onSubmit={save}>
      <div className="card cp" style={{ marginBottom: 16 }}>
        <div className="ct" style={{ marginBottom: 16 }}>Provider Profile</div>
        <div className="fg">
          <div className="fg fg2">
            <div className="field"><label>First Name</label><input defaultValue="Austin" /></div>
            <div className="field"><label>Last Name</label><input defaultValue="Ekeoba" /></div>
          </div>
          <div className="field"><label>Regulated Profession / Designation</label>
            <select defaultValue="OD">
              <option value="MD">MD / DO — Physician</option>
              <option value="OD">OD — Optometrist</option>
              <option value="DDS">DDS / DMD — Dentist</option>
              <option value="OS">Oral Surgeon</option>
              <option value="NP">NP — Nurse Practitioner</option>
              <option value="RN-E">RN — Extended Practice Nurse</option>
              <option value="RM">RM — Registered Midwife</option>
              <option value="DC">DC — Chiropractor</option>
              <option value="PT">PT — Physiotherapist</option>
              <option value="OT">OT — Occupational Therapist</option>
              <option value="SLP">SLP — Speech-Language Pathologist</option>
              <option value="RPsych">RPsych — Psychologist</option>
              <option value="ND">ND — Naturopathic Doctor</option>
              <option value="Podiatrist">Podiatrist / Chiropodist</option>
              <option value="AUD">Audiologist</option>
              <option value="RD">RD — Registered Dietitian</option>
              <option value="RPh">RPh — Pharmacist</option>
              <option value="RO">RO — Registered Optician</option>
            </select>
          </div>
          <div className="fg fg2">
            <div className="field"><label>Provincial Provider Number</label><input placeholder="e.g. 12345 (MSP) / OHIP billing # / AHCIP #" /></div>
            <div className="field"><label>Discipline Code</label><input placeholder="Provincial discipline code" /></div>
          </div>
          <div className="fg fg2">
            <div className="field"><label>College / Regulatory Body</label><input placeholder="e.g. COPTBC, CPSO, ACP…" /></div>
            <div className="field"><label>Registration Number</label><input placeholder="College registration #" /></div>
          </div>
        </div>
      </div>
      <button type="submit" className="btn btn-p">
        {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save Provider</>}
      </button>
    </form>
  );
}

/* ── Integrations ── */
function IntegrationsTab() {
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [chamberApiKey, setChamberApiKey] = useState('sk-ehr-••••••••••••••••••••••••••••');
  const [testing, setTesting] = useState<string | null>(null);

  function copyApiKey() {
    navigator.clipboard?.writeText(chamberApiKey);
    setApiKeyCopied(true); setTimeout(() => setApiKeyCopied(false), 2000);
  }
  function saveWebhook(e: React.FormEvent) {
    e.preventDefault(); setWebhookSaved(true); setTimeout(() => setWebhookSaved(false), 2500);
  }
  function testConnection(label: string) {
    setTesting(label);
    setTimeout(() => setTesting(null), 1600);
  }

  const INTEGRATIONS = [
    {
      id: 'sky-chamber',
      name: 'Sky Chamber EHR',
      description: 'Push approved claims directly from Sky Chamber exam room to Sky Claims billing engine.',
      status: 'connected',
      badge: '#059669',
      badgeBg: '#ecfdf5',
      icon: '🏥',
    },
    {
      id: 'teleplan-prod',
      name: 'Teleplan BC — Production',
      description: 'Claims submission to MSP via Teleplan production endpoint. HIBC conformance complete. Vendor DC V0127.',
      status: 'connected',
      badge: '#059669',
      badgeBg: '#ecfdf5',
      icon: '🌊',
    },
    {
      id: 'ahcip',
      name: 'AHCIP H-Link (Alberta)',
      description: 'Electronic claims submission to Alberta Health via H-Link SFTP. Round 3 conformance complete — 15/15 tests.',
      status: 'conformance',
      badge: '#7c3aed',
      badgeBg: '#f5f3ff',
      icon: '🏔️',
    },
    {
      id: 'ohip',
      name: 'OHIP / MCEDT (Ontario)',
      description: 'Ontario Health Claims via eBSE portal. Fully electronic since April 1 2026. OHIP billing number + HCV required.',
      status: 'available',
      badge: '#8b5cf6',
      badgeBg: '#f5f3ff',
      icon: '🏛️',
    },
    {
      id: 'ramq',
      name: 'RAMQ (Québec)',
      description: 'Facturation RAMQ pour médecins, optométristes et autres professionnels de santé au Québec.',
      status: 'coming_soon',
      badge: '#dc2626',
      badgeBg: '#fff1f3',
      icon: '⚜️',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Sky Chamber EHR API key card */}
      <div className="card cp">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🏥</div>
          <div>
            <div className="ct">Sky Chamber EHR Integration</div>
            <div className="cs">API key for Sky Chamber to push claims into Sky Claims</div>
          </div>
          <span className="badge b-paid" style={{ marginLeft: 'auto' }}>Connected</span>
        </div>

        <div className="alrt al-ok" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={14} className="alrt-ico" />
          <span>Sky Chamber EHR is connected. Claims submitted from exam room will appear in your Claims Queue automatically.</span>
        </div>

        <div className="fg">
          <div className="field">
            <label>Sky Claims API Key</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={chamberApiKey}
                  onChange={(e) => setChamberApiKey(e.target.value)}
                  style={{ paddingRight: 40, fontFamily: 'var(--fm)', fontSize: '.82rem' }}
                />
                <button type="button" onClick={() => setShowKey((s) => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)' }}>
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button type="button" className="btn btn-s btn-sm" onClick={copyApiKey} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {apiKeyCopied ? <><CheckCircle2 size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
              <button type="button" className="btn btn-g btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw size={13} /> Rotate
              </button>
            </div>
            <span className="hint">Paste this key in Sky Chamber EHR → Settings → API → Sky Claims API Key</span>
          </div>

          <form onSubmit={saveWebhook}>
            <div className="field">
              <label>Webhook URL (optional — receive real-time ERA notifications)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/api/sky-claims-webhook"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-p btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {webhookSaved ? <><CheckCircle2 size={13} /> Saved</> : <><Save size={13} /> Save</>}
                </button>
              </div>
              <span className="hint">Sky Claims will POST JSON events to this URL when ERA files arrive or claim status changes.</span>
            </div>
          </form>

          <div>
            <div style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--t2)', marginBottom: 8 }}>Webhook Events</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['claim.submitted', 'claim.paid', 'claim.refused', 'era.received', 'batch.complete'].map((ev) => (
                <span key={ev} style={{
                  fontFamily: 'var(--fm)', fontSize: '.7rem', color: 'var(--lilac)',
                  background: 'var(--lilac-lt)', border: '1px solid var(--lilac-b)',
                  borderRadius: 6, padding: '3px 8px',
                }}>{ev}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Other integrations list */}
      <div>
        <div style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--t1)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Globe size={15} style={{ color: 'var(--lilac)' }} /> Provincial Billing Connections
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {INTEGRATIONS.map((intg) => (
            <div key={intg.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{intg.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--t1)', marginBottom: 3 }}>{intg.name}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--t3)' }}>{intg.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{
                  fontSize: '.68rem', fontWeight: 700, color: intg.badge,
                  background: intg.badgeBg, borderRadius: 20, padding: '3px 10px',
                }}>
                  {intg.status === 'connected' ? '● Connected' : intg.status === 'conformance' ? '✓ Conformance Complete' : intg.status === 'available' ? 'Available' : 'Coming Soon'}
                </span>
                {(intg.status === 'connected' || intg.status === 'conformance') && (
                  <button
                    className="btn btn-s btn-sm"
                    onClick={() => testConnection(intg.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    {testing === intg.id ? <><RefreshCw size={12} className="animate-spin" /> Testing…</> : <><Zap size={12} /> Test</>}
                  </button>
                )}
                {intg.status === 'available' && (
                  <button className="btn btn-p btn-sm">Connect</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Teleplan ── */
function TeleplanTab() {
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ vendorDc: 'V0127', payee: '99609', username: '', password: '', env: 'production' });
  // Password rotation tracker — update this date after each manual password change at the Teleplan portal
  const [pwChanged, setPwChanged] = useState('2026-09-17');
  const [pwMarkSaved, setPwMarkSaved] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const connected = form.vendorDc && form.payee;

  const pwDays = Math.floor((Date.now() - new Date(pwChanged).getTime()) / 86_400_000);
  const daysLeft = 42 - pwDays;
  const pwStatus: 'ok' | 'warn' | 'expired' =
    daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'warn' : 'ok';
  const pwBarPct = Math.min(100, Math.round((pwDays / 42) * 100));
  const pwBarColor = pwStatus === 'expired' ? 'var(--bad)' : pwStatus === 'warn' ? 'var(--warn)' : 'var(--ok)';

  function save(e: React.FormEvent) { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  function markPwChanged() {
    setPwChanged(new Date().toISOString().slice(0, 10));
    setPwMarkSaved(true); setTimeout(() => setPwMarkSaved(false), 2500);
  }

  const baseUrl = form.env === 'production'
    ? 'https://teleplan.hnet.bc.ca/TeleplanBroker'
    : 'https://tlpt2.moh.hnet.bc.ca/TeleplanBroker';

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status banner */}
      <div className={`alrt${connected ? ' al-ok' : ' al-warn'}`}>
        <span className="alrt-ico">{connected ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}</span>
        <span>
          <strong>{connected ? `Connected · Vendor ${form.vendorDc}` : 'Credentials required'}</strong>
          {' — '}
          {connected
            ? `${form.env === 'production' ? 'Production' : 'Test'} · Payee ${form.payee} · HIBC conformance complete`
            : 'Enter your Teleplan vendor credentials to enable claims submission.'}
        </span>
      </div>

      {/* Password Health — always visible, answers the "how do I manage rotation?" question */}
      <div className="card cp">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: pwStatus === 'expired' ? 'var(--bad-lt)' : pwStatus === 'warn' ? 'var(--warn-lt)' : 'var(--ok-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={16} style={{ color: pwBarColor }} />
          </div>
          <div>
            <div className="ct">Password Health</div>
            <div className="cs">Teleplan requires manual password rotation every 42 days</div>
          </div>
          {pwStatus === 'expired' && (
            <span style={{ marginLeft: 'auto', fontSize: '.72rem', fontWeight: 700, background: 'var(--bad-lt)', color: 'var(--bad)', border: '1px solid var(--bad-b)', borderRadius: 20, padding: '3px 10px' }}>
              EXPIRED
            </span>
          )}
          {pwStatus === 'warn' && (
            <span style={{ marginLeft: 'auto', fontSize: '.72rem', fontWeight: 700, background: 'var(--warn-lt)', color: 'var(--warn)', border: '1px solid var(--warn-b)', borderRadius: 20, padding: '3px 10px' }}>
              Expires in {daysLeft}d
            </span>
          )}
          {pwStatus === 'ok' && (
            <span style={{ marginLeft: 'auto', fontSize: '.72rem', fontWeight: 700, background: 'var(--ok-lt)', color: 'var(--ok)', border: '1px solid var(--ok-b)', borderRadius: 20, padding: '3px 10px' }}>
              {daysLeft} days left
            </span>
          )}
        </div>

        {/* Age bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--t3)', marginBottom: 6, fontWeight: 600 }}>
            <span>Day {pwDays} of 42</span>
            <span>Last changed: {pwChanged}</span>
          </div>
          <div className="prog">
            <div className="prog-fill" style={{ width: `${pwBarPct}%`, background: pwBarColor, transition: 'width .4s, background .3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.64rem', color: 'var(--t4)', marginTop: 4 }}>
            <span>0</span>
            <span style={{ color: 'var(--warn)', fontWeight: 700 }}>⚑ Remind at 35</span>
            <span style={{ color: 'var(--bad)', fontWeight: 700 }}>✗ Expires 42</span>
          </div>
        </div>

        {pwStatus !== 'ok' && (
          <div className={`alrt al-${pwStatus === 'expired' ? 'err' : 'warn'}`} style={{ marginBottom: 14 }}>
            <AlertTriangle size={14} className="alrt-ico" />
            <span>
              {pwStatus === 'expired'
                ? `Password expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago. Teleplan will reject logins until you change it. `
                : `Password expires in ${daysLeft} days. Change it now to avoid service interruption. `}
              <strong>Teleplan has no API for password rotation</strong> — you must change it manually in the portal.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-p btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ExternalLink size={13} />
            Change Password at Teleplan Portal
          </a>
          <button type="button" className={`btn btn-sm ${pwMarkSaved ? 'btn-s' : 'btn-g'}`} onClick={markPwChanged} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} />
            {pwMarkSaved ? <><CheckCircle2 size={13}/> Marked — tracker reset</> : 'Mark Changed Today'}
          </button>
        </div>

        <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--n50)', borderRadius: 10, border: '1px solid var(--bd)', fontSize: '.76rem', color: 'var(--t2)', lineHeight: 1.6 }}>
          <strong>Multi-provider rotation:</strong> Each practitioner&apos;s Teleplan account has its own 42-day password cycle.
          Sky Claims tracks the last-changed date per account and sends a reminder email at day 35.
          Passwords cannot be rotated automatically — Teleplan requires the account holder to change them via the portal above.
        </div>
      </div>

      {/* Environment */}
      <div className="card cp">
        <div className="ct" style={{ marginBottom: 14 }}>Environment</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['production', 'test'] as const).map((e) => (
            <button key={e} type="button"
              onClick={() => set('env', e)}
              className={`btn${form.env === e ? ' btn-p' : ' btn-s'}`}
              style={{ flex: 1, justifyContent: 'center' }}>
              {e === 'production' ? '● Production (Live)' : 'Test (Conformance)'}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: '.75rem', color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
          {baseUrl}
        </div>
      </div>

      {/* Vendor credentials */}
      <div className="card cp">
        <div className="ct" style={{ marginBottom: 14 }}>Vendor Credentials</div>
        <div className="fg">
          <div className="fg fg2">
            <div className="field"><label>Vendor / DC Number</label><input value={form.vendorDc} onChange={e => set('vendorDc', e.target.value)} placeholder="V0127" /></div>
            <div className="field"><label>Payee Number</label><input value={form.payee} onChange={e => set('payee', e.target.value)} placeholder="99609" /></div>
          </div>
        </div>
      </div>

      {/* Auth */}
      <div className="card cp">
        <div className="ct" style={{ marginBottom: 14 }}>Authentication</div>
        <div className="fg">
          <div className="field"><label>Username</label><input value={form.username} onChange={e => set('username', e.target.value)} placeholder="your-teleplan-username" /></div>
          <div className="field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={show ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)' }}>
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            <span className="hint">Change this here after rotating it in the portal above, then click Save.</span>
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-p">
        {saved ? <><CheckCircle2 size={14}/> Saved</> : <><Save size={14}/> Save Teleplan Settings</>}
      </button>
    </form>
  );
}

/* ── Billing ── */
function BillingTab() {
  return (
    <div className="card cp">
      <div className="ct" style={{ marginBottom: 6 }}>Subscription</div>
      <div className="cs" style={{ marginBottom: 18 }}>Manage your Sky Claims plan and billing</div>
      <div className="alrt al-ok" style={{ marginBottom: 20 }}>
        <CheckCircle2 size={15} className="alrt-ico" />
        <span><strong>Solo Plan</strong> — Active · $49/mo + GST · Renews Oct 12, 2026</span>
      </div>
      <div className="sum-box">
        <div className="srow"><span style={{ color: 'var(--t3)' }}>Plan</span><span style={{ fontWeight: 600 }}>Sky Claims Solo</span></div>
        <div className="srow"><span style={{ color: 'var(--t3)' }}>Billing</span><span>Monthly</span></div>
        <div className="srow"><span style={{ color: 'var(--t3)' }}>Next charge</span><span>Oct 12, 2026 · $51.45</span></div>
        <div className="srow"><span style={{ color: 'var(--t3)' }}>Payment</span><span style={{ fontFamily: 'var(--fm)' }}>Visa ···· 4242</span></div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn btn-s btn-sm">Manage Billing</button>
        <button className="btn btn-g btn-sm">View Invoices</button>
      </div>
    </div>
  );
}

/* ── Security ── */
function SecurityTab() {
  const [saved, setSaved] = useState(false);
  function save(e: React.FormEvent) { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  return (
    <form onSubmit={save}>
      <div className="card cp" style={{ marginBottom: 16 }}>
        <div className="ct" style={{ marginBottom: 16 }}>Change Password</div>
        <div className="fg">
          <div className="field"><label>Current Password</label><input type="password" placeholder="••••••••" /></div>
          <div className="field"><label>New Password</label><input type="password" placeholder="••••••••" /></div>
          <div className="field"><label>Confirm New Password</label><input type="password" placeholder="••••••••" /></div>
        </div>
      </div>
      <button type="submit" className="btn btn-p">
        {saved ? <><CheckCircle2 size={14}/> Saved</> : <><Lock size={14}/> Update Password</>}
      </button>
    </form>
  );
}

/* ── Compliance ── */
function ComplianceTab() {
  return (
    <div className="card cp">
      <div className="ct" style={{ marginBottom: 18 }}>Compliance &amp; Privacy</div>
      {[
        { ok: true,  label: 'PIPEDA / provincial privacy acts', note: 'All patient data encrypted at rest and in transit' },
        { ok: true,  label: 'PHIPA (Ontario) / FOIPPA (BC)',     note: 'Compliant cloud storage in Canada (Toronto region)' },
        { ok: true,  label: 'Teleplan E45 conformance',           note: 'All 15 H-Link tests + 3 pending ARD (7A/7B/7C) — Rounds 1-3 complete' },
        { ok: true,  label: 'Teleplan Production — connected',    note: 'Vendor DC V0127 live at teleplan.hnet.bc.ca · HIBC conformance accepted' },
        { ok: true,  label: 'AHCIP H-Link conformance (AB)',      note: 'Round 3 batches 554-560 ACCEPTED · Tests 8/9A/9B/10 ARD passed' },
        { ok: true,  label: 'TLS 1.3 in transit',                 note: 'All API traffic uses TLS 1.3' },
        { ok: true,  label: 'PHI audit logging',                   note: 'All PHI access logged with user + timestamp' },
      ].map((item, i) => (
        <div key={i} className="comp-row">
          <div className="comp-ic" style={{ background: item.ok ? 'var(--ok-lt)' : 'var(--warn-lt)' }}>
            {item.ok ? <CheckCircle2 size={13} style={{ color: 'var(--ok)' }}/> : <AlertTriangle size={13} style={{ color: 'var(--warn)' }}/>}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{item.label}</div>
            <div style={{ fontSize: '.74rem', color: 'var(--t3)', marginTop: 2 }}>{item.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

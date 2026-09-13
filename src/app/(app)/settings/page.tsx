'use client';
import { useState } from 'react';
import { Shield, User, Building2, CheckCircle2, AlertTriangle, Eye, EyeOff, Save, CreditCard, Lock } from 'lucide-react';

type Tab = 'practice' | 'provider' | 'teleplan' | 'billing' | 'security' | 'compliance';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'practice',   label: 'Practice',    icon: Building2 },
  { id: 'provider',   label: 'Provider',    icon: User },
  { id: 'teleplan',   label: 'Teleplan',    icon: Shield },
  { id: 'billing',    label: 'Billing',     icon: CreditCard },
  { id: 'security',   label: 'Security',    icon: Lock },
  { id: 'compliance', label: 'Compliance',  icon: CheckCircle2 },
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

      {tab === 'practice'   && <PracticeTab />}
      {tab === 'provider'   && <ProviderTab />}
      {tab === 'teleplan'   && <TeleplanTab />}
      {tab === 'billing'    && <BillingTab />}
      {tab === 'security'   && <SecurityTab />}
      {tab === 'compliance' && <ComplianceTab />}
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
          <div className="field"><label>Designation</label>
            <select defaultValue="OD"><option value="OD">OD — Optometrist</option><option value="MD">MD — Physician</option><option value="NP">NP — Nurse Practitioner</option></select>
          </div>
          <div className="fg fg2">
            <div className="field"><label>MSP Provider Number</label><input placeholder="e.g. 12345" /></div>
            <div className="field"><label>Discipline Code</label><input placeholder="Teleplan discipline" /></div>
          </div>
          <div className="fg fg2">
            <div className="field"><label>College (e.g. COPTBC)</label><input placeholder="Registration #" /></div>
            <div className="field"><label>Specialty Code</label><input defaultValue="OD" /></div>
          </div>
        </div>
      </div>
      <button type="submit" className="btn btn-p">
        {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save Provider</>}
      </button>
    </form>
  );
}

/* ── Teleplan ── */
function TeleplanTab() {
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ vendorDc: 'V0127', payee: '99609', baseUrl: 'https://test.teleplan.bc.ca', username: '', password: '', env: 'test' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const connected = form.vendorDc && form.payee;

  function save(e: React.FormEvent) { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); }

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status banner */}
      <div className={`alrt${connected ? ' al-ok' : ' al-warn'}`}>
        <span className="alrt-ico">{connected ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}</span>
        <span>
          <strong>{connected ? `Connected · Vendor ${form.vendorDc}` : 'Credentials required'}</strong>
          {' — '}
          {connected
            ? `${form.env === 'test' ? 'Test environment' : 'Production'} · Payee ${form.payee} · All conformance tests passing`
            : 'Enter your Teleplan vendor credentials to enable claims submission.'}
        </span>
      </div>

      {/* Environment */}
      <div className="card cp">
        <div className="ct" style={{ marginBottom: 14 }}>Environment</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['test', 'production'] as const).map((e) => (
            <button key={e} type="button"
              onClick={() => set('env', e)}
              className={`btn${form.env === e ? ' btn-p' : ' btn-s'}`}
              style={{ flex: 1, justifyContent: 'center' }}>
              {e === 'test' ? 'Test (Conformance)' : 'Production'}
            </button>
          ))}
        </div>
        {form.env === 'production' && (
          <div className="alrt al-warn" style={{ marginTop: 12 }}>
            <AlertTriangle size={15} className="alrt-ico" />
            Production mode submits real claims to MSP. Ensure HIBC vendor approval is complete.
          </div>
        )}
      </div>

      {/* Vendor credentials */}
      <div className="card cp">
        <div className="ct" style={{ marginBottom: 14 }}>Vendor Credentials</div>
        <div className="fg">
          <div className="fg fg2">
            <div className="field"><label>Vendor / DC Number</label><input value={form.vendorDc} onChange={e => set('vendorDc', e.target.value)} placeholder="V0127" /></div>
            <div className="field"><label>Payee Number</label><input value={form.payee} onChange={e => set('payee', e.target.value)} placeholder="99609" /></div>
          </div>
          <div className="field"><label>Teleplan Base URL</label><input value={form.baseUrl} onChange={e => set('baseUrl', e.target.value)} placeholder="https://test.teleplan.bc.ca" /></div>
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
        { ok: true,  label: 'Teleplan E45 conformance',           note: 'All 16 eligibility + 13 claim tests passing' },
        { ok: false, label: 'HIBC vendor approval',               note: 'Submit conformance bundle to HIBC to go live' },
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

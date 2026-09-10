'use client';
import { useState } from 'react';
import { Settings, Shield, User, Building2, CheckCircle2, AlertTriangle, Eye, EyeOff, Save } from 'lucide-react';

type Tab = 'practice' | 'provider' | 'teleplan';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('teleplan');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-[13px] text-white/40 mt-1">Configure your practice, providers, and Teleplan connection</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/[0.07] pb-0">
        {([
          { id: 'teleplan', label: 'Teleplan', icon: Shield },
          { id: 'practice',  label: 'Practice',  icon: Building2 },
          { id: 'provider',  label: 'Provider',  icon: User },
        ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-purple-500 text-white'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'teleplan' && <TeleplanTab />}
      {tab === 'practice'  && <PracticeTab />}
      {tab === 'provider'  && <ProviderTab />}
    </div>
  );
}

/* ── Teleplan credentials ── */
function TeleplanTab() {
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    vendorDc: 'V0127',
    payee: '99609',
    baseUrl: 'https://test.teleplan.bc.ca',
    username: '',
    password: '',
    env: 'test',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const connected = form.vendorDc && form.payee;

  return (
    <form onSubmit={save} className="space-y-5">
      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-xl border p-4 ${
        connected ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-amber-500/25 bg-amber-500/5'}`}>
        {connected
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
        <div>
          <div className={`font-semibold text-[14px] ${connected ? 'text-emerald-300' : 'text-amber-300'}`}>
            {connected ? `Connected · Vendor ${form.vendorDc}` : 'Credentials required'}
          </div>
          <div className="text-[11px] text-white/40 mt-0.5">
            {connected
              ? `${form.env === 'test' ? 'Test environment' : 'Production'} · Payee ${form.payee} · All 16 E45 + 13 claim conformance tests passing`
              : 'Enter your Teleplan vendor credentials to enable claims submission'}
          </div>
        </div>
        <div className="ml-auto">
          <span className={`text-[11px] px-2 py-1 rounded-lg font-medium uppercase tracking-wider ${
            form.env === 'test' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
            {form.env}
          </span>
        </div>
      </div>

      {/* Environment toggle */}
      <Section title="Environment">
        <div className="flex gap-3">
          {(['test', 'production'] as const).map((e) => (
            <button key={e} type="button" onClick={() => set('env', e)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium capitalize transition-colors border ${
                form.env === e
                  ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                  : 'border-white/10 text-white/40 hover:text-white/60'}`}>
              {e === 'test' ? 'Test (Conformance)' : 'Production'}
            </button>
          ))}
        </div>
        {form.env === 'production' && (
          <div className="text-[12px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Production mode submits real claims to MSP. Ensure HIBC vendor approval is complete before enabling.
          </div>
        )}
      </Section>

      {/* Vendor credentials */}
      <Section title="Vendor Credentials">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vendor / DC Number" value={form.vendorDc} onChange={(v) => set('vendorDc', v)} placeholder="V0127" />
          <Field label="Payee Number" value={form.payee} onChange={(v) => set('payee', v)} placeholder="99609" />
        </div>
        <Field label="Teleplan Base URL" value={form.baseUrl} onChange={(v) => set('baseUrl', v)} placeholder="https://test.teleplan.bc.ca" />
      </Section>

      {/* Auth */}
      <Section title="Authentication">
        <Field label="Username" value={form.username} onChange={(v) => set('username', v)} placeholder="your-teleplan-username" />
        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="••••••••"
              className="input pr-10 text-[13px]"
            />
            <button type="button" onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </Section>

      <button type="submit" className="btn-purple w-full justify-center py-2.5 text-[13px]">
        {saved
          ? <><CheckCircle2 className="w-4 h-4" /> Saved</>
          : <><Save className="w-4 h-4" /> Save Teleplan Settings</>}
      </button>
    </form>
  );
}

/* ── Practice ── */
function PracticeTab() {
  return (
    <div className="space-y-5">
      <Section title="Practice Information">
        <Field label="Practice Name" value="Sky Eye Care" onChange={() => {}} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Province" value="BC" onChange={() => {}} />
          <Field label="City" value="Vancouver" onChange={() => {}} />
        </div>
        <Field label="Business Number (CRA)" value="" onChange={() => {}} placeholder="123456789 RT0001" />
      </Section>
      <button className="btn-purple w-full justify-center py-2.5 text-[13px]">
        <Save className="w-4 h-4" /> Save Practice
      </button>
    </div>
  );
}

/* ── Provider ── */
function ProviderTab() {
  return (
    <div className="space-y-5">
      <Section title="Provider Profile">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" value="Austin" onChange={() => {}} />
          <Field label="Last Name" value="Ekeoba" onChange={() => {}} />
        </div>
        <Field label="MSP Provider Number" value="" onChange={() => {}} placeholder="e.g. 12345" />
        <Field label="College Registration #" value="" onChange={() => {}} placeholder="COPTBC number" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Specialty Code" value="OD" onChange={() => {}} />
          <Field label="Discipline Code" value="" onChange={() => {}} placeholder="Teleplan discipline" />
        </div>
      </Section>
      <button className="btn-purple w-full justify-center py-2.5 text-[13px]">
        <Save className="w-4 h-4" /> Save Provider
      </button>
    </div>
  );
}

/* ── Helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-[13px] font-semibold text-white/60">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-white/50 mb-1.5">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="input text-[13px]" />
    </div>
  );
}

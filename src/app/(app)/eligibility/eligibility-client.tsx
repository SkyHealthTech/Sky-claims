'use client';

import { useState } from 'react';
import {
  ShieldCheck, Search, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Eye, CalendarDays, User, Clock, MapPin, Plus,
} from 'lucide-react';
import Link from 'next/link';
import { recordEligibilityCheck } from '@/lib/actions/eligibility';
import type { EligCheck } from '@/lib/dal';

type EligResult = {
  ok: boolean; phn: string; name?: string; province: string;
  birthDate?: string; gender?: string;
  eligible?: boolean; eligibleOnDate?: boolean; coverageEndDate?: string;
  subsidyPaidToDate?: number | null; subsidyNotInsured?: boolean;
  eyeExamDate?: string; clientInstruction?: string;
  errorMsg?: string; message?: string;
};

const PROVINCE_META: Record<string, { plan: string; idLabel: string; idPlaceholder: string; color: string }> = {
  BC: { plan: 'MSP / Teleplan E45',  idLabel: 'PHN',                 idPlaceholder: '9151 210 417', color: '#059669' },
  AB: { plan: 'AHCIP / H-Link',      idLabel: 'Alberta ULI / PHN',   idPlaceholder: '1234-567-890', color: '#d97706' },
  ON: { plan: 'OHIP / MCEDT',        idLabel: 'OHIP Card Number',     idPlaceholder: '1234-567-890', color: '#8b5cf6' },
  MB: { plan: 'EPiCS / Manitoba',    idLabel: 'PHIN',                 idPlaceholder: '123456789',    color: '#0891b2' },
};

export default function EligibilityClient({
  initialHistory,
}: {
  initialHistory: EligCheck[];
}) {
  const [province, setProvince] = useState<'BC' | 'AB' | 'ON' | 'MB'>('BC');
  const [phn, setPhn] = useState('');
  const [dob, setDob] = useState('');
  const [dos, setDos] = useState(new Date().toISOString().slice(0, 10));
  const [eyeExam, setEyeExam] = useState(true);
  const [subsidy, setSubsidy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<EligCheck[]>(initialHistory);

  const meta = PROVINCE_META[province];

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/teleplan/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phn: phn.replace(/\s/g, ''),
          birthDate: dob.replace(/-/g, ''),
          dateOfService: dos.replace(/-/g, ''),
          checkEyeExam: eyeExam,
          checkSubsidy: subsidy,
          province,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Eligibility check failed');
      } else {
        const r: EligResult = { ...data, phn: phn.replace(/\s/g, ''), province };
        setResult(r);

        // Save to Supabase (best-effort)
        await recordEligibilityCheck({
          province,
          health_card_no: phn.replace(/\s/g, ''),
          patient_name: data.name,
          date_of_birth: dob || undefined,
          eligible: r.eligible ?? r.eligibleOnDate ?? false,
          coverage_type: data.coverageType,
          message: data.clientInstruction ?? data.message,
          raw_response: data,
        });

        // Prepend to local history
        setHistory(prev => [{
          id: `local-${Date.now()}`,
          practice_id: '',
          province,
          health_card_no: phn.replace(/\s/g, ''),
          patient_name: data.name ?? null,
          date_of_birth: dob || null,
          checked_at: new Date().toISOString(),
          eligible: r.eligible ?? r.eligibleOnDate ?? false,
          coverage_type: data.coverageType ?? null,
          message: data.clientInstruction ?? data.message ?? null,
          raw_response: data,
        }, ...prev.slice(0, 19)]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const eligibleBool = result?.eligible ?? result?.eligibleOnDate ?? false;

  return (
    <div style={{ maxWidth: 940 }}>
      <h1 style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-.02em', marginBottom: 4 }}>
        Eligibility Verification
      </h1>
      <p style={{ fontSize: '.83rem', color: 'var(--t3)', marginBottom: 22 }}>
        Real-time provincial coverage checks via Teleplan E45 and partner integrations.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Form ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Province */}
          <div className="card cp">
            <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <MapPin size={14} style={{ color: 'var(--sky)' }}/> Province
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
              {(['BC', 'AB', 'ON', 'MB'] as const).map(p => {
                const pm = PROVINCE_META[p];
                return (
                  <button
                    key={p} type="button"
                    onClick={() => setProvince(p)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 3, padding: '8px 4px', borderRadius: 10,
                      border: `1.5px solid ${province === p ? pm.color : 'var(--bd2)'}`,
                      background: province === p ? pm.color + '0e' : 'var(--wh)',
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--ff)',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '.88rem', color: province === p ? pm.color : 'var(--t2)' }}>{p}</span>
                    <span style={{ fontSize: '.62rem', color: 'var(--t4)' }}>{pm.plan.split(' / ')[0]}</span>
                  </button>
                );
              })}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
              borderRadius: 8, background: meta.color + '0d', fontSize: '.74rem',
              color: meta.color, fontWeight: 600, border: `1px solid ${meta.color}28`,
            }}>
              <ShieldCheck size={12}/> {meta.plan}
            </div>
          </div>

          {/* Form */}
          <div className="card cp">
            <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <User size={14} style={{ color: 'var(--sky)' }}/> Patient Details
            </div>
            <form onSubmit={check}>
              <div className="fg">
                <div className="field">
                  <label>{meta.idLabel} <span style={{ color: 'var(--bad)' }}>*</span></label>
                  <input
                    required value={phn}
                    onChange={e => setPhn(e.target.value)}
                    placeholder={meta.idPlaceholder}
                    maxLength={14}
                    style={{ fontFamily: 'var(--fm)', letterSpacing: '.12em', fontSize: '1rem' }}
                  />
                </div>

                <div className="fg fg2">
                  <div className="field">
                    <label>Date of birth</label>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)}/>
                  </div>
                  <div className="field">
                    <label>Date of service <span style={{ color: 'var(--bad)' }}>*</span></label>
                    <input required type="date" value={dos} onChange={e => setDos(e.target.value)}/>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20 }}>
                  {[
                    { label: 'Last eye exam', val: eyeExam, set: setEyeExam },
                    { label: 'Subsidy status', val: subsidy, set: setSubsidy },
                  ].map(({ label, val, set }) => (
                    <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.83rem', color: 'var(--t2)', cursor: 'pointer', fontWeight: 500 }}>
                      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)}
                        style={{ accentColor: 'var(--sky)', width: 16, height: 16 }}/>
                      {label}
                    </label>
                  ))}
                </div>

                {error && (
                  <div className="alrt al-err">
                    <AlertTriangle size={14} className="alrt-ico"/> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn btn-p" style={{ justifyContent: 'center' }}>
                  {loading
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/> Checking…</>
                    : <><Search size={14}/> Check Eligibility</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right: Result + history ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Result */}
          {result ? (
            <div className="card cp" style={{
              borderColor: eligibleBool ? 'var(--ok-b)' : 'var(--bad-b)',
              borderWidth: 1.5,
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
                paddingBottom: 16, borderBottom: '1px solid var(--bd)',
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                  background: eligibleBool ? 'var(--ok-lt)' : 'var(--bad-lt)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {eligibleBool
                    ? <CheckCircle2 size={26} style={{ color: 'var(--ok)' }}/>
                    : <XCircle size={26} style={{ color: 'var(--bad)' }}/>}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem', color: eligibleBool ? 'var(--ok)' : 'var(--bad)' }}>
                    {eligibleBool ? 'Patient is Eligible' : 'Patient Not Eligible'}
                  </div>
                  <div style={{ fontSize: '.76rem', color: 'var(--t3)', marginTop: 3 }}>
                    {province} • {PROVINCE_META[province].plan} • as of {dos}
                  </div>
                </div>
                <Link
                  href={`/claims/new?phn=${encodeURIComponent(phn)}&province=${province}`}
                  className="btn btn-p btn-sm"
                  style={{ marginLeft: 'auto', flexShrink: 0 }}
                >
                  <Plus size={12}/> New Claim
                </Link>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {result.name && (
                  <InfoBox icon={User} label="Patient Name" value={result.name}/>
                )}
                {result.birthDate && (
                  <InfoBox icon={CalendarDays} label="Date of Birth"
                    value={`${result.birthDate.slice(0,4)}-${result.birthDate.slice(4,6)}-${result.birthDate.slice(6,8)}`}/>
                )}
                {result.coverageEndDate && (
                  <InfoBox icon={AlertTriangle} label="Coverage Ends" value={result.coverageEndDate} warn/>
                )}
                {eyeExam && result.eyeExamDate && (
                  <InfoBox icon={Eye} label="Last Eye Exam" value={result.eyeExamDate}/>
                )}
                {subsidy && (
                  <InfoBox icon={ShieldCheck} label="Subsidy"
                    value={result.subsidyNotInsured ? 'Not insured' : `$${result.subsidyPaidToDate ?? 0} paid to date`}/>
                )}
              </div>

              {result.clientInstruction && (
                <div className="alrt al-warn">
                  <AlertTriangle size={14} className="alrt-ico"/> {result.clientInstruction}
                </div>
              )}
              {result.message && !result.clientInstruction && (
                <div className="alrt al-info">
                  <ShieldCheck size={14} className="alrt-ico"/> {result.message}
                </div>
              )}
            </div>
          ) : (
            <div className="card cp" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div className="empty-ico" style={{ display: 'inline-flex', marginBottom: 14 }}>
                <ShieldCheck size={22} style={{ color: 'var(--t4)' }}/>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 5 }}>No result yet</div>
              <div style={{ fontSize: '.8rem', color: 'var(--t4)' }}>
                Enter a health card number and check date to verify coverage
              </div>
            </div>
          )}

          {/* History */}
          <div className="card">
            <div className="cp" style={{ paddingBottom: 0 }}>
              <div className="ch">
                <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Clock size={14} style={{ color: 'var(--t4)' }}/> Recent Checks
                </div>
                <span style={{ fontSize: '.74rem', color: 'var(--t4)', fontWeight: 600 }}>
                  {history.length} saved
                </span>
              </div>
            </div>

            {history.length === 0 ? (
              <div style={{ padding: '18px 22px', fontSize: '.8rem', color: 'var(--t4)', textAlign: 'center' }}>
                No checks recorded yet. Results are saved automatically.
              </div>
            ) : (
              <div>
                {history.slice(0, 10).map((h, i) => {
                  const pm = PROVINCE_META[h.province] ?? PROVINCE_META.BC;
                  return (
                    <div
                      key={h.id ?? i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 22px',
                        borderBottom: i < Math.min(history.length, 10) - 1 ? '1px solid var(--bd)' : 'none',
                      }}
                    >
                      {h.eligible
                        ? <CheckCircle2 size={14} style={{ color: 'var(--ok)', flexShrink: 0 }}/>
                        : <XCircle size={14} style={{ color: 'var(--bad)', flexShrink: 0 }}/>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.patient_name ?? '—'}
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--t4)', fontFamily: 'var(--fm)', marginTop: 1 }}>
                          {h.health_card_no}
                        </div>
                      </div>
                      <span style={{
                        fontWeight: 700, fontSize: '.67rem', padding: '2px 7px',
                        borderRadius: 20, background: pm.color + '14', color: pm.color,
                        flexShrink: 0,
                      }}>{h.province}</span>
                      <span className={`badge ${h.eligible ? 'b-active' : 'b-rejected'}`} style={{ flexShrink: 0 }}>
                        {h.eligible ? 'Eligible' : 'Refused'}
                      </span>
                      <span style={{ fontSize: '.7rem', color: 'var(--t4)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {relTime(h.checked_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value, warn }: { icon: React.ElementType; label: string; value: string; warn?: boolean }) {
  return (
    <div style={{
      background: warn ? 'var(--warn-lt)' : 'var(--n50)',
      border: `1px solid ${warn ? 'var(--warn-b)' : 'var(--bd)'}`,
      borderRadius: 10, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <Icon size={12} style={{ color: warn ? 'var(--warn)' : 'var(--t4)', flexShrink: 0 }}/>
        <span style={{ fontSize: '.66rem', color: warn ? 'var(--warn)' : 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: '.88rem', color: warn ? 'var(--warn)' : 'var(--t1)' }}>{value}</div>
    </div>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

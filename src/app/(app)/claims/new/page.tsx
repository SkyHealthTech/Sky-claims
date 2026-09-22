'use client';

import { useState, useActionState, useEffect, useRef, Fragment, Suspense } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Save, MapPin, User, ChevronDown,
  AlertTriangle, RefreshCw, ShieldCheck, XCircle, Loader2,
  ChevronRight, Search, X,
} from 'lucide-react';
import Link from 'next/link';
import { saveClaim, type ClaimFormState } from '@/lib/actions/claims';

function SubmitButton({ done }: { done?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || done} className="btn btn-p">
      {pending ? 'Saving…' : <><Save size={13}/> Save Draft</>}
    </button>
  );
}

// ── Province fee schedules ────────────────────────────────────────────────────
const FEE_SCHEDULES: Record<string, { code: string; desc: string; fee: number }[]> = {
  BC: [
    { code: '00110', desc: 'Comprehensive visual assessment',  fee: 88.35  },
    { code: '00111', desc: 'Partial visual assessment',        fee: 54.00  },
    { code: '00113', desc: 'Supplemental visual assessment',   fee: 73.55  },
    { code: '00115', desc: 'Complete eye examination',         fee: 107.20 },
    { code: '00116', desc: 'Limited eye examination',          fee: 54.00  },
    { code: '00118', desc: 'Contact lens evaluation',          fee: 73.55  },
  ],
  AB: [
    { code: '03.03A', desc: 'Limited Assessment (SOMB)',        fee: 40.23 },
    { code: '03.03B', desc: 'Intermediate Assessment',          fee: 62.49 },
    { code: '03.03C', desc: 'Complete Assessment',              fee: 97.74 },
    { code: '03.05A', desc: 'Supplemental Exam',                fee: 34.18 },
    { code: '03.07A', desc: 'Contact Lens Evaluation',          fee: 58.92 },
    { code: '08.19E', desc: 'EMSAF — Corneal Topography',       fee: 71.54 },
  ],
  ON: [
    { code: 'A661A', desc: 'Major Eye Exam (GP)',               fee: 57.28 },
    { code: 'A663A', desc: 'Minor Eye Exam / Follow-up',        fee: 26.25 },
    { code: 'A664A', desc: 'Visual Field Test (unilateral)',    fee: 29.40 },
    { code: 'A665A', desc: 'Visual Field Test (bilateral)',     fee: 49.35 },
    { code: 'A667A', desc: 'Contact Lens Fitting',              fee: 38.10 },
  ],
  MB: [
    { code: '10.10', desc: 'Comprehensive Eye Exam', fee: 75.00 },
    { code: '10.12', desc: 'Partial Eye Exam',        fee: 42.00 },
    { code: '10.14', desc: 'Follow-up Assessment',    fee: 30.00 },
  ],
};

const PROVINCE_META: Record<string, { plan: string; idLabel: string; idPlaceholder: string; hint?: string; color: string }> = {
  BC: { plan: 'Teleplan / MSP',   idLabel: 'PHN (Personal Health Number)', idPlaceholder: '9151 210 417', color: '#059669' },
  AB: { plan: 'AHCIP / H-Link',   idLabel: 'PHN (Alberta ULI)',             idPlaceholder: '1234-567-890',
        hint: 'Submitted via AHCIP H-Link SFTP batch to Alberta Health.', color: '#d97706' },
  ON: { plan: 'OHIP / MCEDT',     idLabel: 'OHIP Card Number',              idPlaceholder: '1234-567-890-ON',
        hint: 'Submitted via OHIP MCEDT portal.', color: '#8b5cf6' },
  MB: { plan: 'EPiCS / Manitoba', idLabel: 'PHIN (Manitoba)',               idPlaceholder: '123456789', color: '#0891b2' },
};

const ICD_CODES = [
  'H52.1 — Myopia',           'H52.4 — Presbyopia',        'H40.0 — Glaucoma suspect',
  'H40.1 — Open-angle glaucoma','H53.2 — Diplopia',          'H27.0 — Aphakia',
  'H35.3 — Degeneration of macula','Z01.0 — Routine eye exam','H35.81 — Retinal edema',
  'H43.1 — Vitreous haemorrhage','Z96.1 — Presence of intraocular lens','H26.0 — Infantile cataract',
  'H50.0 — Convergent concomitant strabismus','H52.0 — Hypermetropia','H52.2 — Astigmatism',
];

type Province = 'BC' | 'AB' | 'ON' | 'MB';

const STEPS = ['Patient', 'Service', 'Review & Save'];
const PROV_KEY = 'skyclaims_billing_province';
const initialState: ClaimFormState = {};

// ── Province Switch Modal ─────────────────────────────────────────────────────
function ProvinceSwitchModal({
  current, onSelect, onClose,
}: {
  current: Province; onSelect: (p: Province) => void; onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--wh)', borderRadius: 16, padding: 24, width: 320,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--t1)' }}>
            <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/>
            Billing Province
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}>
            <X size={16}/>
          </button>
        </div>
        <p style={{ fontSize: '.8rem', color: 'var(--t3)', marginBottom: 16 }}>
          Your selection will be remembered for future claims.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['BC', 'AB', 'ON', 'MB'] as Province[]).map(p => {
            const pm = PROVINCE_META[p];
            const isSelected = p === current;
            return (
              <button
                key={p}
                onClick={() => { onSelect(p); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${isSelected ? pm.color : 'var(--bd)'}`,
                  background: isSelected ? pm.color + '0e' : 'var(--wh)',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: pm.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '.88rem', color: pm.color,
                }}>{p}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--t1)' }}>{pm.plan.split(' / ')[0]}</div>
                  <div style={{ fontSize: '.73rem', color: 'var(--t3)' }}>{pm.plan.split(' / ')[1] ?? pm.plan}</div>
                </div>
                {isSelected && <CheckCircle2 size={16} style={{ color: pm.color, marginLeft: 'auto' }}/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Inline Eligibility Check ──────────────────────────────────────────────────
type EligResult = {
  ok: boolean; eligible?: boolean; eligibleOnDate?: boolean;
  name?: string; eyeExamDate?: string; coverageEndDate?: string;
  clientInstruction?: string; message?: string; errorMsg?: string;
};

function EligibilityPanel({ phn, dob, province }: { phn: string; dob: string; province: Province }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dos, setDos] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<EligResult | null>(null);
  const [err, setErr] = useState('');
  const meta = PROVINCE_META[province];

  async function run() {
    if (!phn.replace(/\s/g, '')) { setErr('Enter a PHN first.'); return; }
    setLoading(true); setErr(''); setResult(null);
    try {
      const res = await fetch('/api/teleplan/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phn: phn.replace(/\s/g, ''),
          birthDate: dob.replace(/-/g, ''),
          dateOfService: dos.replace(/-/g, ''),
          checkEyeExam: true,
          checkSubsidy: false,
          province,
        }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error ?? 'Check failed');
      else setResult({ ...data, ok: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const eligible = result?.eligible ?? result?.eligibleOnDate ?? false;

  return (
    <div style={{
      border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', marginTop: 12,
    }}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'var(--n50)', border: 'none', cursor: 'pointer',
          fontSize: '.82rem', fontWeight: 600, color: 'var(--sky-dk)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <ShieldCheck size={13}/>
          Check Eligibility
          {result && (
            <span style={{
              marginLeft: 6, fontSize: '.68rem', fontWeight: 700, padding: '2px 8px',
              borderRadius: 20,
              background: eligible ? 'var(--ok-lt)' : 'var(--bad-lt)',
              color: eligible ? 'var(--ok)' : 'var(--bad)',
            }}>
              {eligible ? '✓ Eligible' : '✗ Not Eligible'}
            </span>
          )}
        </span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.15s' }}/>
      </button>

      {open && (
        <div style={{ padding: '14px', background: 'var(--wh)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: '.78rem', color: 'var(--t3)' }}>
            Verify MSP / {meta.plan.split('/')[1]?.trim() ?? meta.plan} coverage before billing.
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label style={{ fontSize: '.75rem' }}>Date of service</label>
              <input type="date" value={dos} onChange={e => setDos(e.target.value)} style={{ fontSize: '.82rem' }}/>
            </div>
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="btn btn-p"
              style={{ flexShrink: 0, padding: '8px 14px' }}
            >
              {loading
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/> Checking…</>
                : <><Search size={13}/> Check</>}
            </button>
          </div>

          {err && (
            <div className="alrt al-err" style={{ fontSize: '.78rem' }}>
              <AlertTriangle size={12} className="alrt-ico"/> {err}
            </div>
          )}

          {result && (
            <div style={{
              borderRadius: 8, padding: '12px 14px',
              background: eligible ? 'var(--ok-lt)' : 'var(--bad-lt)',
              border: `1px solid ${eligible ? 'var(--ok-b)' : 'var(--bad-b)'}`,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '.88rem',
                color: eligible ? 'var(--ok)' : 'var(--bad)' }}>
                {eligible ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}
                {eligible ? 'Patient is Eligible' : 'Not Eligible'}
              </div>
              {result.name && (
                <div style={{ fontSize: '.78rem', color: 'var(--t2)' }}>
                  <strong>Name on file:</strong> {result.name}
                </div>
              )}
              {result.eyeExamDate && (
                <div style={{ fontSize: '.78rem', color: 'var(--t3)' }}>
                  <strong>Last eye exam:</strong> {result.eyeExamDate}
                </div>
              )}
              {result.clientInstruction && (
                <div style={{ fontSize: '.76rem', color: 'var(--warn)', marginTop: 2 }}>
                  ⚠ {result.clientInstruction}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function NewClaimPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction] = useActionState(saveClaim, initialState);

  const [step, setStep] = useState(0);

  // Province — persisted to localStorage
  const [province, setProvince] = useState<Province>('BC');
  const [showProvinceModal, setShowProvinceModal] = useState(false);

  // PHN autoname
  const [nameLoading, setNameLoading] = useState(false);
  const [nameFound, setNameFound] = useState(false);
  const phnLookupRef = useRef<string>('');

  const [form, setForm] = useState({
    patient_name: '',
    phn: '',
    dob: '',
    dos: new Date().toISOString().slice(0, 10),
    fee_code: '00110',
    dx_code: 'H52.1 — Myopia',
    notes: '',
  });

  // Load province: URL param → localStorage override → practice profile default
  useEffect(() => {
    const urlProv = searchParams.get('province') as Province | null;
    const urlPhn  = searchParams.get('phn');

    if (urlProv) {
      // Explicit province in URL (e.g. from eligibility page) takes priority
      setProvince(urlProv);
      setForm(f => ({
        ...f,
        fee_code: FEE_SCHEDULES[urlProv]?.[0]?.code ?? '00110',
        phn: urlPhn ?? f.phn,
      }));
      return;
    }

    const localOverride = localStorage.getItem(PROV_KEY) as Province | null;
    if (localOverride) {
      // User has manually switched province before — respect their choice
      setProvince(localOverride);
      setForm(f => ({
        ...f,
        fee_code: FEE_SCHEDULES[localOverride]?.[0]?.code ?? '00110',
        phn: urlPhn ?? f.phn,
      }));
    }

    // Always fetch the practice's registered province as the base default
    fetch('/api/practice/province')
      .then(r => r.json())
      .then(({ province: practiceProvince }: { province: string }) => {
        const p = (practiceProvince as Province) ?? 'BC';
        if (!localOverride && !urlProv) {
          // No user override and no URL param — use what was set at registration
          setProvince(p);
          setForm(f => ({
            ...f,
            fee_code: FEE_SCHEDULES[p]?.[0]?.code ?? '00110',
            phn: urlPhn ?? f.phn,
          }));
        }
      })
      .catch(() => {/* silently fall back to BC */});

    if (urlPhn) {
      setForm(f => ({ ...f, phn: urlPhn }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  function changeProvince(p: Province) {
    setProvince(p);
    localStorage.setItem(PROV_KEY, p);
    set('fee_code', FEE_SCHEDULES[p]?.[0]?.code ?? '00110');
  }

  const meta = PROVINCE_META[province] ?? PROVINCE_META.BC;
  const codes = FEE_SCHEDULES[province] ?? FEE_SCHEDULES.BC;
  const feeItem = codes.find(c => c.code === form.fee_code) ?? codes[0];

  // PHN blur → look up patient name
  async function onPhnBlur() {
    const clean = form.phn.replace(/\s/g, '');
    if (!clean || clean === phnLookupRef.current || form.patient_name) return;
    phnLookupRef.current = clean;
    setNameLoading(true);
    try {
      const res = await fetch(`/api/patients/lookup?phn=${encodeURIComponent(clean)}&province=${province}`);
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          set('patient_name', data.name);
          if (data.dob && !form.dob) set('dob', data.dob);
          setNameFound(true);
          setTimeout(() => setNameFound(false), 3000);
        }
      }
    } catch {
      // silent — autoname is best-effort
    } finally {
      setNameLoading(false);
    }
  }

  // Navigate steps
  function next(e: React.FormEvent) {
    e.preventDefault();
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() { setStep(s => Math.max(s - 1, 0)); }

  // After successful save, redirect
  if (state?.success && state.claimId) {
    setTimeout(() => router.push('/claims'), 800);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {showProvinceModal && (
        <ProvinceSwitchModal
          current={province}
          onSelect={changeProvince}
          onClose={() => setShowProvinceModal(false)}
        />
      )}

      {/* Back */}
      <p style={{ marginBottom: 20 }}>
        <Link href="/claims" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.82rem', color: 'var(--t3)', textDecoration: 'none', fontWeight: 600 }}>
          <ArrowLeft size={13}/> Back to Claims
        </Link>
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-.02em', marginBottom: 4 }}>
            New Claim
          </h1>
          <p style={{ fontSize: '.84rem', color: 'var(--t3)' }}>
            Create a provincial insurance claim. Draft will be saved and submitted when ready.
          </p>
        </div>
        {/* Compact province badge */}
        <button
          type="button"
          onClick={() => setShowProvinceModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            borderRadius: 10, border: `1.5px solid ${meta.color}40`,
            background: meta.color + '0e', cursor: 'pointer', flexShrink: 0,
            marginTop: 4,
          }}
        >
          <MapPin size={13} style={{ color: meta.color }}/>
          <span style={{ fontWeight: 700, fontSize: '.82rem', color: meta.color }}>{province}</span>
          <span style={{ fontSize: '.72rem', color: 'var(--t3)' }}>· {meta.plan.split(' / ')[0]}</span>
          <RefreshCw size={11} style={{ color: 'var(--t4)', marginLeft: 2 }}/>
        </button>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 28 }}>
        {STEPS.map((label, i) => (
          <Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: i < step ? 'pointer' : 'default' }}
              onClick={() => i < step ? setStep(i) : undefined}>
              <div className={`snode ${i < step ? 's-done' : i === step ? 's-act' : 's-pend'}`}>
                {i < step ? <CheckCircle2 size={13}/> : i + 1}
              </div>
              <div className="slbl" style={{ color: i === step ? 'var(--sky-dk)' : 'var(--t4)', fontWeight: i === step ? 700 : 500 }}>{label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`sline${i < step ? ' done' : ''}`} style={{ marginTop: 14 }}/>
            )}
          </Fragment>
        ))}
      </div>

      {/* Step 0: Patient */}
      {step === 0 && (
        <form onSubmit={next}>
          {/* Patient details */}
          <div className="card cp" style={{ marginBottom: 18 }}>
            <div className="ch">
              <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <User size={14} style={{ color: 'var(--sky)' }}/> Patient Details
              </div>
              <span style={{
                fontSize: '.72rem', fontWeight: 600, padding: '3px 10px',
                borderRadius: 20, background: meta.color + '14', color: meta.color,
              }}>
                {meta.idLabel.split(' ')[0]}
              </span>
            </div>
            <div className="fg">
              {/* PHN field with autoname */}
              <div className="field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>{meta.idLabel} <span style={{ color: 'var(--bad)' }}>*</span></label>
                  {nameLoading && (
                    <span style={{ fontSize: '.72rem', color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }}/> Looking up patient…
                    </span>
                  )}
                  {nameFound && (
                    <span style={{ fontSize: '.72rem', color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11}/> Name filled from records
                    </span>
                  )}
                </div>
                <input
                  required
                  type="text"
                  value={form.phn}
                  onChange={e => { set('phn', e.target.value); setNameFound(false); phnLookupRef.current = ''; }}
                  onBlur={onPhnBlur}
                  placeholder={meta.idPlaceholder}
                  style={{ fontFamily: 'var(--fm)', letterSpacing: '.08em' }}
                />
              </div>

              <div className="fg fg2">
                <div className="field">
                  <label>Patient name</label>
                  <input
                    type="text"
                    value={form.patient_name}
                    onChange={e => set('patient_name', e.target.value)}
                    placeholder="Auto-filled from PHN, or enter manually"
                    style={{ fontSize: '.82rem' }}
                  />
                </div>
                <div className="field">
                  <label>Date of birth</label>
                  <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)}/>
                </div>
              </div>
            </div>

            {meta.hint && (
              <div className="alrt al-info" style={{ marginTop: 14 }}>
                <AlertTriangle size={13} className="alrt-ico"/> {meta.hint}
              </div>
            )}

            {/* Inline eligibility check */}
            <EligibilityPanel phn={form.phn} dob={form.dob} province={province} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
            <Link
              href="/claims/batch"
              className="btn btn-g"
              style={{ fontSize: '.8rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <User size={12}/> Batch billing
            </Link>
            <button type="submit" className="btn btn-p">
              Patient info → Service <ChevronRight size={13}/>
            </button>
          </div>
        </form>
      )}

      {/* Step 1: Service */}
      {step === 1 && (
        <form onSubmit={next}>
          <div className="card cp" style={{ marginBottom: 18 }}>
            <div className="ch">
              <div className="ct">Service Details</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '.78rem', color: 'var(--sky-dk)', fontWeight: 700 }}>
                {feeItem ? `$${feeItem.fee.toFixed(2)}` : ''}
              </div>
            </div>
            <div className="fg">
              <div className="field">
                <label>Date of service <span style={{ color: 'var(--bad)' }}>*</span></label>
                <input required type="date" value={form.dos} onChange={e => set('dos', e.target.value)}/>
              </div>

              {/* Fee code picker */}
              <div className="field">
                <label>Fee code <span style={{ color: 'var(--bad)' }}>*</span></label>
                <select
                  required
                  value={form.fee_code}
                  onChange={e => set('fee_code', e.target.value)}
                  style={{ fontFamily: 'var(--fm)' }}
                >
                  {codes.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.desc} (${c.fee.toFixed(2)})
                    </option>
                  ))}
                </select>
                {feeItem && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: '.74rem', color: 'var(--t3)' }}>{feeItem.desc}</span>
                    <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: '.84rem', color: 'var(--sky-dk)' }}>${feeItem.fee.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* ICD code */}
              <div className="field">
                <label>Diagnosis code (ICD-10)</label>
                <select value={form.dx_code} onChange={e => set('dx_code', e.target.value)}>
                  <option value="">— Select —</option>
                  {ICD_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Notes (internal — not transmitted)</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Optional notes for your records"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-s" onClick={prev}>← Patient</button>
            <button type="submit" className="btn btn-p">
              Review <ChevronRight size={13}/>
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Review + Save */}
      {step === 2 && (
        <form action={formAction}>
          {/* Hidden fields for server action */}
          <input type="hidden" name="province" value={province}/>
          <input type="hidden" name="patient_name" value={form.patient_name}/>
          <input type="hidden" name="phn" value={form.phn}/>
          <input type="hidden" name="dob" value={form.dob}/>
          <input type="hidden" name="dos" value={form.dos}/>
          <input type="hidden" name="fee_code" value={feeItem?.code ?? form.fee_code}/>
          <input type="hidden" name="fee_desc" value={feeItem?.desc ?? ''}/>
          <input type="hidden" name="fee_amount" value={String(feeItem?.fee ?? 0)}/>
          <input type="hidden" name="dx_code" value={form.dx_code}/>
          <input type="hidden" name="notes" value={form.notes}/>

          {/* Review card */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="cp" style={{ paddingBottom: 0 }}>
              <div className="ct" style={{ marginBottom: 14 }}>Claim Summary</div>
            </div>
            <div className="sum-box" style={{ margin: '0 22px 22px' }}>
              {[
                { label: 'Province / System', value: `${province} — ${meta.plan}` },
                { label: 'Patient', value: form.patient_name || 'Not entered' },
                { label: meta.idLabel, value: form.phn || '—' },
                { label: 'Date of birth', value: form.dob || '—' },
                { label: 'Date of service', value: form.dos },
                { label: 'Fee code', value: feeItem ? `${feeItem.code} — ${feeItem.desc}` : form.fee_code },
                { label: 'Diagnosis', value: form.dx_code || '—' },
                { label: 'Notes', value: form.notes || '—' },
              ].map(({ label, value }) => (
                <div className="srow" key={label}>
                  <span style={{ color: 'var(--t3)', fontSize: '.82rem' }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: '.82rem', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
              <div className="srow" style={{ borderTop: '2px solid var(--bd)', marginTop: 4, paddingTop: 12 }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--sky-dk)' }}>
                  ${feeItem?.fee.toFixed(2) ?? '0.00'}
                </span>
              </div>
            </div>
          </div>

          {state?.error && (
            <div className="alrt al-err" style={{ marginBottom: 14 }}>
              <AlertTriangle size={14} className="alrt-ico"/> {state.error}
            </div>
          )}
          {state?.success && (
            <div className="alrt al-ok" style={{ marginBottom: 14 }}>
              <CheckCircle2 size={14} className="alrt-ico"/> Claim saved! Redirecting…
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-s" onClick={prev}>← Service</button>
            <SubmitButton done={state?.success} />
          </div>
        </form>
      )}
    </div>
  );
}

export default function NewClaimPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>
        Loading…
      </div>
    }>
      <NewClaimPageInner />
    </Suspense>
  );
}

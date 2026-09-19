'use client';

import { useState, Fragment } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Save, MapPin, User, ChevronDown, AlertTriangle } from 'lucide-react';
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

const initialState: ClaimFormState = {};

export default function NewClaimPage() {
  const router = useRouter();
  const [state, formAction] = useFormState(saveClaim, initialState);

  const [step, setStep] = useState(0);
  const [province, setProvince] = useState<Province>('BC');
  const [form, setForm] = useState({
    patient_name: '',
    phn: '',
    dob: '',
    dos: new Date().toISOString().slice(0, 10),
    fee_code: '00110',
    dx_code: 'H52.1 — Myopia',
    notes: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const meta = PROVINCE_META[province] ?? PROVINCE_META.BC;
  const codes = FEE_SCHEDULES[province] ?? FEE_SCHEDULES.BC;
  const feeItem = codes.find(c => c.code === form.fee_code) ?? codes[0];

  function changeProvince(p: Province) {
    setProvince(p);
    set('fee_code', FEE_SCHEDULES[p]?.[0]?.code ?? '00110');
  }

  // Navigate steps
  function next(e: React.FormEvent) {
    e.preventDefault();
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() { setStep(s => Math.max(s - 1, 0)); }

  // After successful save, redirect
  if (state?.success && state.claimId) {
    // Redirect to claims list
    setTimeout(() => router.push('/claims'), 800);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Back */}
      <p style={{ marginBottom: 20 }}>
        <Link href="/claims" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.82rem', color: 'var(--t3)', textDecoration: 'none', fontWeight: 600 }}>
          <ArrowLeft size={13}/> Back to Claims
        </Link>
      </p>

      <h1 style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-.02em', marginBottom: 6 }}>
        New Claim
      </h1>
      <p style={{ fontSize: '.84rem', color: 'var(--t3)', marginBottom: 24 }}>
        Create a provincial insurance claim. The draft will be saved and you can submit it when ready.
      </p>

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
          {/* Province picker */}
          <div className="card cp" style={{ marginBottom: 18 }}>
            <div className="ch">
              <div>
                <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <MapPin size={14} style={{ color: meta.color }}/> Province &amp; Billing Plan
                </div>
                <div className="cs">{meta.plan}</div>
              </div>
              <span style={{
                fontWeight: 700, fontSize: '.72rem', padding: '3px 10px',
                borderRadius: 20, background: meta.color + '14', color: meta.color,
              }}>{province}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['BC', 'AB', 'ON', 'MB'] as Province[]).map(p => {
                const pm = PROVINCE_META[p];
                return (
                  <button
                    key={p} type="button"
                    onClick={() => changeProvince(p)}
                    className="prac-sel-row"
                    style={{
                      flexDirection: 'column', gap: 4, textAlign: 'center', padding: '10px 8px',
                      borderColor: province === p ? pm.color : undefined,
                      background: province === p ? pm.color + '0e' : undefined,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '.88rem', color: province === p ? pm.color : 'var(--t1)' }}>{p}</span>
                    <span style={{ fontSize: '.66rem', color: 'var(--t4)', whiteSpace: 'nowrap' }}>{pm.plan.split(' / ')[0]}</span>
                  </button>
                );
              })}
            </div>
            {meta.hint && (
              <div className="alrt al-info" style={{ marginTop: 14 }}>
                <AlertTriangle size={13} className="alrt-ico"/> {meta.hint}
              </div>
            )}
          </div>

          {/* Patient details */}
          <div className="card cp" style={{ marginBottom: 18 }}>
            <div className="ch">
              <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <User size={14} style={{ color: 'var(--sky)' }}/> Patient Details
              </div>
            </div>
            <div className="fg">
              <div className="field">
                <label>Patient name (optional)</label>
                <input
                  type="text"
                  value={form.patient_name}
                  onChange={e => set('patient_name', e.target.value)}
                  placeholder="First Last"
                />
              </div>
              <div className="fg fg2">
                <div className="field">
                  <label>{meta.idLabel} <span style={{ color: 'var(--bad)' }}>*</span></label>
                  <input
                    required
                    type="text"
                    value={form.phn}
                    onChange={e => set('phn', e.target.value)}
                    placeholder={meta.idPlaceholder}
                    style={{ fontFamily: 'var(--fm)', letterSpacing: '.08em' }}
                  />
                </div>
                <div className="field">
                  <label>Date of birth</label>
                  <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)}/>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-p">
              Patient info → Service <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }}/>
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
              Review <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }}/>
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

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Save, Search } from 'lucide-react';
import Link from 'next/link';

const MSP_CODES = [
  { code: '00110', desc: 'Comprehensive visual assessment',   fee: 88.35 },
  { code: '00111', desc: 'Partial visual assessment',         fee: 54.00 },
  { code: '00113', desc: 'Supplemental visual assessment',    fee: 73.55 },
  { code: '00115', desc: 'Complete eye examination',          fee: 107.20 },
  { code: '00116', desc: 'Limited eye examination',           fee: 54.00 },
  { code: '00118', desc: 'Contact lens evaluation',           fee: 73.55 },
];

const ICD_CODES = ['H52.1', 'H52.4', 'H40.0', 'H40.1', 'H53.2', 'H27.0', 'H35.3', 'Z01.0'];

export default function NewClaimPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    phn: '', dob: '', dos: new Date().toISOString().slice(0, 10),
    feeCode: '00110', dxCode: 'H52.1', notes: '',
  });
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const feeItem = MSP_CODES.find(c => c.code === form.feeCode) ?? MSP_CODES[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => router.push('/claims'), 1500);
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Link href="/claims" className="btn btn-g btn-sm">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, marginBottom: 28 }}>
        {['Patient', 'Service', 'Review'].map((label, i) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: i < step ? 'var(--sky)' : 'var(--bd)', borderRadius: 2 }} />}
              <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.76rem', fontWeight: 700, flexShrink: 0, ...(step > i + 1 ? { background: 'var(--ok)', color: '#fff' } : step === i + 1 ? { background: 'var(--sky)', color: '#fff', boxShadow: '0 0 0 5px rgba(37,99,235,.18)' } : { background: 'var(--wh)', color: 'var(--t4)', border: '1.5px solid var(--bd2)' }) }}>
                {step > i + 1 ? <CheckCircle2 size={14}/> : i + 1}
              </div>
              {i < 2 && <div style={{ flex: 1, height: 2, background: step > i + 1 ? 'var(--sky)' : 'var(--bd)', borderRadius: 2 }} />}
            </div>
            <div style={{ fontSize: '.66rem', color: step === i + 1 ? 'var(--sky-dk)' : 'var(--t4)', marginTop: 6, fontWeight: 700, letterSpacing: '.04em', textAlign: 'center', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 18 }}>Patient Details</div>
            <div className="fg">
              <div className="field">
                <label>PHN (Personal Health Number)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', lineHeight: 0 }}>
                    <Search size={14}/>
                  </span>
                  <input required value={form.phn} onChange={e => set('phn', e.target.value)}
                    placeholder="9151 210 417" maxLength={12} style={{ paddingLeft: 36, fontFamily: 'var(--fm)', letterSpacing: '.1em' }} />
                </div>
              </div>
              <div className="fg fg2">
                <div className="field"><label>Date of Birth</label><input type="date" required value={form.dob} onChange={e => set('dob', e.target.value)} /></div>
                <div className="field"><label>Date of Service</label><input type="date" required value={form.dos} onChange={e => set('dos', e.target.value)} /></div>
              </div>
              <button type="button" className="btn btn-p" style={{ justifyContent: 'center' }} onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 18 }}>Service &amp; Diagnosis</div>
            <div className="fg">
              <div className="field">
                <label>MSP Fee Item</label>
                <select value={form.feeCode} onChange={e => set('feeCode', e.target.value)}>
                  {MSP_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.desc} (${c.fee.toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>ICD-10 Diagnosis Code</label>
                <select value={form.dxCode} onChange={e => set('dxCode', e.target.value)}>
                  {ICD_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Notes (optional)</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Clinical notes for this claim…" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-s" onClick={() => setStep(1)}>← Back</button>
                <button type="button" className="btn btn-p" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(3)}>Review →</button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 18 }}>Review &amp; Submit</div>
            <div className="sum-box" style={{ marginBottom: 18 }}>
              <div className="srow"><span style={{ color: 'var(--t3)' }}>PHN</span><span style={{ fontFamily: 'var(--fm)', fontWeight: 600 }}>{form.phn}</span></div>
              <div className="srow"><span style={{ color: 'var(--t3)' }}>Date of Birth</span><span>{form.dob}</span></div>
              <div className="srow"><span style={{ color: 'var(--t3)' }}>Date of Service</span><span>{form.dos}</span></div>
              <div className="srow"><span style={{ color: 'var(--t3)' }}>Fee Item</span><span><span className="code-chip">{feeItem.code}</span> — {feeItem.desc}</span></div>
              <div className="srow"><span style={{ color: 'var(--t3)' }}>Diagnosis</span><span><span className="icd-chip">{form.dxCode}</span></span></div>
              <div className="srow"><span style={{ color: 'var(--t3)' }}>Amount</span><span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--sky-dk)' }}>${feeItem.fee.toFixed(2)}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-s" onClick={() => setStep(2)}>← Back</button>
              <button type="submit" className="btn btn-p" style={{ flex: 1, justifyContent: 'center' }}>
                {saved ? <><CheckCircle2 size={14}/> Submitted!</> : <><Save size={14}/> Submit Claim</>}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

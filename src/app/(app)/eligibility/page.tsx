'use client';
import { useState } from 'react';
import { ShieldCheck, Search, Loader2, CheckCircle2, XCircle, AlertTriangle, Eye, CalendarDays, User, Clock } from 'lucide-react';

type EligResult = {
  ok: boolean; phn: string; name?: string; birthDate?: string; gender?: string;
  eligibleOnDate: boolean; coverageEndDate?: string;
  subsidyPaidToDate?: number | null; subsidyNotInsured?: boolean;
  eyeExamDate?: string; clientInstruction?: string; errorMsg?: string;
};

const HISTORY_DEMO: EligResult[] = [
  { ok: true, phn: '9151210417', name: 'James Burnham', eligibleOnDate: true, birthDate: '19620314' },
  { ok: true, phn: '9151065434', name: 'Christine Burrows', eligibleOnDate: true, birthDate: '19780522' },
  { ok: false, phn: '9151242549', name: 'Austin Mercer', eligibleOnDate: false, birthDate: '19901108' },
];

export default function EligibilityPage() {
  const [phn, setPhn] = useState('');
  const [dob, setDob] = useState('');
  const [dos, setDos] = useState(new Date().toISOString().slice(0, 10));
  const [eyeExam, setEyeExam] = useState(true);
  const [subsidy, setSubsidy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<EligResult[]>(HISTORY_DEMO);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Check failed');
      else { setResult(data); setHistory((h) => [data, ...h.slice(0, 9)]); }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Form card */}
        <div className="card cp">
          <div className="ch">
            <div>
              <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={17} style={{ color: 'var(--sky)' }} /> Patient Details
              </div>
              <div className="cs">E45 real-time MSP verification via Teleplan</div>
            </div>
          </div>
          <form onSubmit={check}>
            <div className="fg">
              <div className="field">
                <label>PHN (Personal Health Number)</label>
                <input required value={phn} onChange={e => setPhn(e.target.value)}
                  placeholder="9151 210 417" maxLength={12}
                  style={{ fontFamily: 'var(--fm)', letterSpacing: '.12em', fontSize: '1rem' }}
                />
              </div>
              <div className="field">
                <label>Date of Birth</label>
                <input type="date" required value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              <div className="field">
                <label>Date of Service</label>
                <input type="date" required value={dos} onChange={e => setDos(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.84rem', color: 'var(--t2)', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={eyeExam} onChange={e => setEyeExam(e.target.checked)} style={{ accentColor: 'var(--sky)', width: 16, height: 16 }} />
                  Last eye exam
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.84rem', color: 'var(--t2)', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={subsidy} onChange={e => setSubsidy(e.target.checked)} style={{ accentColor: 'var(--sky)', width: 16, height: 16 }} />
                  Subsidy status
                </label>
              </div>
              {error && (
                <div className="alrt al-err">
                  <AlertTriangle size={15} className="alrt-ico" /> {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn btn-p" style={{ justifyContent: 'center' }}>
                {loading
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Checking…</>
                  : <><Search size={14} /> Check Eligibility</>}
              </button>
            </div>
          </form>
        </div>

        {/* Result + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result && (
            <div className="card cp" style={{ borderColor: result.eligibleOnDate ? 'var(--ok-b)' : 'var(--bad-b)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                {result.eligibleOnDate
                  ? <CheckCircle2 size={28} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                  : <XCircle size={28} style={{ color: 'var(--bad)', flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: result.eligibleOnDate ? 'var(--ok)' : 'var(--bad)' }}>
                    {result.eligibleOnDate ? 'Eligible' : 'Not Eligible'}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--t3)' }}>on date of service</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InfoRow icon={User} label="Name" value={result.name ?? '—'} />
                <InfoRow icon={CalendarDays} label="Date of Birth"
                  value={result.birthDate ? `${result.birthDate.slice(0,4)}-${result.birthDate.slice(4,6)}-${result.birthDate.slice(6,8)}` : '—'}
                />
                {result.coverageEndDate && <InfoRow icon={AlertTriangle} label="Coverage Ends" value={result.coverageEndDate} warn />}
                {eyeExam && result.eyeExamDate && <InfoRow icon={Eye} label="Last Eye Exam" value={result.eyeExamDate} />}
                {subsidy && <InfoRow icon={ShieldCheck} label="Subsidy"
                  value={result.subsidyNotInsured ? 'Not insured' : `$${result.subsidyPaidToDate ?? 0} paid to date`} />}
                {result.clientInstruction && (
                  <div className="alrt al-warn"><AlertTriangle size={14} className="alrt-ico" /> {result.clientInstruction}</div>
                )}
              </div>
            </div>
          )}

          {!result && (
            <div className="card cp" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div className="empty-ico" style={{ display: 'inline-flex', marginBottom: 14 }}>
                <ShieldCheck size={24} style={{ color: 'var(--t4)' }} />
              </div>
              <div style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>No result yet</div>
              <div style={{ fontSize: '.8rem', color: 'var(--t4)' }}>Enter a PHN and date of birth to check coverage</div>
            </div>
          )}

          {/* Recent checks */}
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Clock size={15} style={{ color: 'var(--t4)' }} /> Recent Checks
            </div>
            {history.slice(0, 6).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
                {h.eligibleOnDate
                  ? <CheckCircle2 size={14} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                  : <XCircle size={14} style={{ color: 'var(--bad)', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name ?? '—'}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{h.phn}</div>
                </div>
                <span className={`badge ${h.eligibleOnDate ? 'b-active' : 'b-rejected'}`}>{h.eligibleOnDate ? 'Eligible' : 'Refused'}</span>
              </div>
            ))}
            {history.length === 0 && (
              <div style={{ fontSize: '.8rem', color: 'var(--t4)', padding: '8px 0' }}>No checks yet this session</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, warn }: { icon: any; label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={14} style={{ color: warn ? 'var(--warn)' : 'var(--t4)', flexShrink: 0 }} />
      <span style={{ color: 'var(--t3)', width: 110, flexShrink: 0, fontSize: '.82rem' }}>{label}</span>
      <span style={{ fontWeight: 600, color: warn ? 'var(--warn)' : 'var(--t1)', fontSize: '.84rem' }}>{value}</span>
    </div>
  );
}

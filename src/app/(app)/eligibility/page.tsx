'use client';
import { useState } from 'react';
import { ShieldCheck, Search, Loader2, CheckCircle2, XCircle, AlertTriangle, Eye, CalendarDays, User } from 'lucide-react';

type EligResult = {
  ok: boolean; phn: string; name?: string; birthDate?: string; gender?: string;
  eligibleOnDate: boolean; coverageEndDate?: string; coverageEndReason?: string;
  subsidyPaidToDate?: number | null; subsidyNotInsured?: boolean;
  eyeExamDate?: string; eyeExamNoPayment?: boolean;
  clientInstruction?: string; errorMsg?: string;
};

export default function EligibilityPage() {
  const [phn, setPhn]         = useState('');
  const [dob, setDob]         = useState('');
  const [dos, setDos]         = useState(new Date().toISOString().slice(0, 10));
  const [eyeExam, setEyeExam] = useState(true);
  const [subsidy, setSubsidy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<EligResult | null>(null);
  const [error, setError]     = useState('');
  const [history, setHistory] = useState<EligResult[]>([]);

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
      if (!res.ok) { setError(data.error ?? 'Check failed'); }
      else {
        setResult(data);
        setHistory((h) => [data, ...h.slice(0, 9)]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">Eligibility Check</h1>
        <p className="text-[13px] text-white/40 mt-1">Real-time E45 MSP coverage verification via Teleplan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Form */}
        <form onSubmit={check} className="card p-5 space-y-4">
          <h2 className="font-semibold text-white/80 text-[14px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" /> Patient Details
          </h2>

          <div>
            <label className="block text-[12px] font-medium text-white/50 mb-1.5">PHN (BC Personal Health Number)</label>
            <input
              required value={phn} onChange={e => setPhn(e.target.value)}
              placeholder="9151 210 417" className="input text-[14px] font-mono tracking-widest"
              maxLength={12}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-white/50 mb-1.5">Date of Birth</label>
            <input type="date" required value={dob} onChange={e => setDob(e.target.value)} className="input text-[13px]" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-white/50 mb-1.5">Date of Service</label>
            <input type="date" required value={dos} onChange={e => setDos(e.target.value)} className="input text-[13px]" />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[13px] text-white/60 cursor-pointer">
              <input type="checkbox" checked={eyeExam} onChange={e => setEyeExam(e.target.checked)} className="accent-sky-400" />
              Last eye exam date
            </label>
            <label className="flex items-center gap-2 text-[13px] text-white/60 cursor-pointer">
              <input type="checkbox" checked={subsidy} onChange={e => setSubsidy(e.target.checked)} className="accent-sky-400" />
              Subsidy status
            </label>
          </div>

          {error && (
            <div className="text-[12px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-[13px]">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : <><Search className="w-4 h-4" /> Check Eligibility</>}
          </button>
        </form>

        {/* Result */}
        <div className="space-y-4">
          {result && (
            <div className={`card p-5 space-y-4 border ${result.eligibleOnDate ? 'border-emerald-500/25' : 'border-red-500/25'}`}>
              <div className="flex items-center gap-3">
                {result.eligibleOnDate
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  : <XCircle className="w-6 h-6 text-red-400 shrink-0" />}
                <div>
                  <div className={`font-bold text-[15px] ${result.eligibleOnDate ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.eligibleOnDate ? 'Eligible' : 'Not Eligible'}
                  </div>
                  <div className="text-[11px] text-white/40">on date of service</div>
                </div>
              </div>

              <div className="space-y-2.5 text-[13px]">
                <Row icon={User} label="Name" value={result.name ?? '-'} />
                <Row icon={CalendarDays} label="Date of Birth" value={result.birthDate ? `${result.birthDate.slice(0,4)}-${result.birthDate.slice(4,6)}-${result.birthDate.slice(6,8)}` : '-'} />
                {result.coverageEndDate && <Row icon={AlertTriangle} label="Coverage Ends" value={result.coverageEndDate} warn />}
                {eyeExam && result.eyeExamDate && (
                  <Row icon={Eye} label="Last Eye Exam" value={result.eyeExamDate} />
                )}
                {subsidy && (
                  <Row icon={ShieldCheck} label="Subsidy" value={result.subsidyNotInsured ? 'Not insured' : `$${result.subsidyPaidToDate ?? 0} paid to date`} />
                )}
                {result.clientInstruction && (
                  <div className="text-[12px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    {result.clientInstruction}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 1 && (
            <div className="card p-4">
              <div className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Recent Checks</div>
              <div className="space-y-1.5">
                {history.slice(1).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-white/50">
                    {h.eligibleOnDate
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className="flex-1 truncate">{h.name ?? h.phn}</span>
                    <span className="text-white/30">{h.phn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, warn }: { icon: any; label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${warn ? 'text-amber-400' : 'text-white/30'}`} />
      <span className="text-white/40 w-28 shrink-0">{label}</span>
      <span className={`font-medium ${warn ? 'text-amber-300' : 'text-white/80'}`}>{value}</span>
    </div>
  );
}

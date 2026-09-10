'use client';
import { useState } from 'react';
import { Search, Plus, Filter, AlertCircle, CheckCircle2, Clock, FileText, ChevronDown, Send } from 'lucide-react';
import Link from 'next/link';

const CLAIMS = [
  { id: 'CLM-1042', patient: 'James Burnham',     phn: '9151210417', code: '00110', dx: '3671', amount: 88.35,  status: 'paid',      date: '2026-08-05', refusal: null },
  { id: 'CLM-1041', patient: 'Christine Burrows',  phn: '9151065434', code: '00115', dx: '3652', amount: 107.20, status: 'paid',      date: '2026-08-05', refusal: null },
  { id: 'CLM-1040', patient: 'Austin Mercer',      phn: '9151242549', code: '00110', dx: '3660', amount: 88.35,  status: 'refused',   date: '2026-08-04', refusal: 'C12-21: Invalid diagnosis code for service' },
  { id: 'CLM-1039', patient: 'Linda Thorpe',       phn: '9151071072', code: '00111', dx: '3671', amount: 54.00,  status: 'submitted', date: '2026-08-04', refusal: null },
  { id: 'CLM-1038', patient: 'Robert Chan',        phn: '9151274799', code: '00110', dx: '3655', amount: 88.35,  status: 'paid',      date: '2026-08-03', refusal: null },
  { id: 'CLM-1037', patient: 'Sarah Nikolaev',     phn: '9151206012', code: '00113', dx: '3671', amount: 73.55,  status: 'draft',     date: '2026-08-03', refusal: null },
  { id: 'CLM-1036', patient: 'Michael Torres',     phn: '9151259051', code: '00110', dx: '3671', amount: 88.35,  status: 'draft',     date: '2026-08-03', refusal: null },
];

const FILTERS = ['all', 'draft', 'submitted', 'paid', 'refused'] as const;
type Filter = typeof FILTERS[number];

const STATUS_MAP: Record<string, { label: string; cls: string; icon: any }> = {
  paid:      { label: 'Paid',      cls: 'badge-ok',     icon: CheckCircle2 },
  submitted: { label: 'Submitted', cls: 'badge-sky',    icon: Send },
  refused:   { label: 'Refused',   cls: 'badge-danger', icon: AlertCircle },
  draft:     { label: 'Draft',     cls: 'badge-muted',  icon: FileText },
};

export default function ClaimsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = CLAIMS.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.patient.toLowerCase().includes(search.toLowerCase()) && !c.phn.includes(search)) return false;
    return true;
  });

  const drafts = CLAIMS.filter(c => c.status === 'draft');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">Claims</h1>
        <div className="flex gap-2">
          {drafts.length > 0 && (
            <button className="btn-purple text-[13px]">
              <Send className="w-3.5 h-3.5" /> Submit {drafts.length} Draft{drafts.length > 1 ? 's' : ''}
            </button>
          )}
          <Link href="/claims/new" className="btn-primary text-[13px]">
            <Plus className="w-3.5 h-3.5" /> New Claim
          </Link>
        </div>
      </div>

      {/* Filter + search bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.07] p-1 gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg capitalize transition-all ${filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or PHN…" className="input pl-9 text-[13px] py-2" />
        </div>
      </div>

      {/* Claims table */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 text-[11px] font-semibold text-white/30 uppercase tracking-widest px-5 py-3 border-b border-white/[0.05]">
          <span>Patient / PHN</span>
          <span className="pr-8">Service</span>
          <span className="pr-8">Amount</span>
          <span className="pr-5">Status</span>
          <span>Date</span>
        </div>
        {visible.length === 0 && (
          <div className="py-12 text-center text-white/30 text-[13px]">No claims match this filter.</div>
        )}
        {visible.map((c) => {
          const st = STATUS_MAP[c.status] ?? STATUS_MAP.draft;
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="border-b border-white/[0.05] last:border-0">
              <button
                onClick={() => setExpanded(isOpen ? null : c.id)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div>
                  <div className="text-[13px] font-medium text-white/80">{c.patient}</div>
                  <div className="text-[11px] text-white/35 mt-0.5">{c.id} · PHN {c.phn}</div>
                </div>
                <div className="text-[12px] text-white/50 pr-8">{c.code} · Dx {c.dx}</div>
                <div className="text-[13px] font-semibold text-white/70 pr-8">${c.amount.toFixed(2)}</div>
                <div className="pr-5"><span className={`badge ${st.cls}`}>{st.label}</span></div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                  {c.date}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 bg-white/[0.015]">
                  {c.refusal && (
                    <div className="flex items-start gap-2 text-[12px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div><strong>Refusal:</strong> {c.refusal}</div>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {c.status === 'draft' && <button className="btn-purple text-[12px] py-1.5 px-3"><Send className="w-3 h-3" /> Submit</button>}
                    {c.status === 'refused' && <button className="btn-primary text-[12px] py-1.5 px-3">Fix &amp; Resubmit</button>}
                    <button className="btn text-[12px] py-1.5 px-3">Edit</button>
                    <button className="btn text-[12px] py-1.5 px-3 text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

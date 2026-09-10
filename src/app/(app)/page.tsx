'use client';
import { useState } from 'react';
import { FileText, ShieldCheck, Receipt, TrendingUp, AlertCircle, CheckCircle2, Clock, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// ── Mock data (replace with Supabase queries) ─────────────────────────────────
const STATS = [
  { label: 'MTD Revenue',     value: '$18,420',  sub: '247 claims paid',        icon: TrendingUp,   color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  { label: 'Pending',         value: '14',        sub: 'awaiting submission',    icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20' },
  { label: 'Refused (C12)',   value: '3',         sub: 'need attention',         icon: AlertCircle,  color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
  { label: 'Submitted Today', value: '28',        sub: '$2,104 sent',            icon: FileText,     color: 'text-sky-400',     bg: 'bg-sky-400/10 border-sky-400/20' },
];

const RECENT_CLAIMS = [
  { id: 'CLM-1042', patient: 'James Burnham',     code: '00110',  dx: '3671', amount: 88.35,  status: 'paid',      date: '2026-08-05' },
  { id: 'CLM-1041', patient: 'Christine Burrows',  code: '00115',  dx: '3652', amount: 107.20, status: 'paid',      date: '2026-08-05' },
  { id: 'CLM-1040', patient: 'Austin Mercer',      code: '00110',  dx: '3660', amount: 88.35,  status: 'refused',   date: '2026-08-04' },
  { id: 'CLM-1039', patient: 'Linda Thorpe',       code: '00111',  dx: '3671', amount: 54.00,  status: 'submitted', date: '2026-08-04' },
  { id: 'CLM-1038', patient: 'Robert Chan',        code: '00110',  dx: '3655', amount: 88.35,  status: 'paid',      date: '2026-08-03' },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  paid:      { label: 'Paid',      cls: 'badge-ok' },
  submitted: { label: 'Submitted', cls: 'badge-sky' },
  refused:   { label: 'Refused',   cls: 'badge-danger' },
  draft:     { label: 'Draft',     cls: 'badge-muted' },
};

const QUICK_ACTIONS = [
  { href: '/eligibility', icon: ShieldCheck, label: 'Check Eligibility',  color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/20' },
  { href: '/claims/new',  icon: FileText,    label: 'Submit Claims',      color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
  { href: '/remittances', icon: Receipt,     label: 'Retrieve Remittances', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  { href: '/claims?filter=refused', icon: AlertCircle, label: 'Review Refusals', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
];

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-white/40 mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); }}
          className="btn text-[13px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="card p-4 space-y-3">
            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
              <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider mt-0.5">{s.label}</div>
              <div className="text-[11px] text-white/30 mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent claims */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white text-[15px]">Recent Claims</h2>
            <Link href="/claims" className="text-[12px] text-sky-400 hover:text-sky-300 flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-1">
            {RECENT_CLAIMS.map((c) => {
              const st = STATUS_MAP[c.status] ?? STATUS_MAP.draft;
              return (
                <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-white/80 truncate">{c.patient}</span>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="text-[11px] text-white/35 mt-0.5">{c.id} · {c.code} · Dx {c.dx} · {c.date}</div>
                  </div>
                  <div className="text-[13px] font-semibold text-white/70 shrink-0">${c.amount.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white text-[15px] mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" /> Quick Actions
          </h2>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors hover:border-white/[0.15] ${a.bg}`}>
                <a.icon className={`w-4 h-4 ${a.color} shrink-0`} />
                <span className="text-[13px] font-medium text-white/80">{a.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/30 ml-auto" />
              </Link>
            ))}
          </div>

          {/* Teleplan status */}
          <div className="mt-5 pt-4 border-t border-white/[0.05]">
            <div className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2">Teleplan Status</div>
            <div className="flex items-center gap-2 text-[12px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected · Vendor V0127
            </div>
            <div className="text-[11px] text-white/30 mt-1">Last sync: today 08:14 AM</div>
          </div>
        </div>
      </div>
    </div>
  );
}

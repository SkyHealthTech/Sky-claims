'use client';
import { useState } from 'react';
import {
  DollarSign, Download, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, AlertTriangle, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RemittLine = {
  id: string; claimRef: string; patient: string; phn: string; dos: string;
  feeItem: string; billed: number; paid: number; status: 'paid' | 'refused' | 'adjusted';
  refusalCode?: string; refusalReason?: string; adjustmentNote?: string;
};
type Remittance = {
  id: string; receivedAt: string; payPeriod: string; totalBilled: number;
  totalPaid: number; lineCount: number; refusalCount: number; lines: RemittLine[];
};

const MOCK: Remittance[] = [
  {
    id: 'RA-2026-08',
    receivedAt: '2026-08-05',
    payPeriod: 'July 2026',
    totalBilled: 4820.00,
    totalPaid: 4460.00,
    lineCount: 38,
    refusalCount: 3,
    lines: [
      { id: 'l1', claimRef: 'CLM-0041', patient: 'Margaret Thompson', phn: '9151 210 417', dos: '2026-07-14', feeItem: '00810', billed: 89.90, paid: 89.90, status: 'paid' },
      { id: 'l2', claimRef: 'CLM-0042', patient: 'David Park', phn: '9151 220 831', dos: '2026-07-15', feeItem: '00810', billed: 89.90, paid: 89.90, status: 'paid' },
      { id: 'l3', claimRef: 'CLM-0043', patient: 'Amara Diallo', phn: '9999 000 000', dos: '2026-07-15', feeItem: '00810', billed: 89.90, paid: 0, status: 'refused', refusalCode: 'C12', refusalReason: 'PHN not found — verify and resubmit' },
      { id: 'l4', claimRef: 'CLM-0044', patient: 'Chen Wei', phn: '9151 198 022', dos: '2026-07-18', feeItem: '00050', billed: 32.15, paid: 28.95, status: 'adjusted', adjustmentNote: 'Fee item paid at lower rate — fee schedule update effective 2026-07-01' },
      { id: 'l5', claimRef: 'CLM-0045', patient: 'Priya Sharma', phn: '9151 305 114', dos: '2026-07-19', feeItem: '00810', billed: 89.90, paid: 89.90, status: 'paid' },
      { id: 'l6', claimRef: 'CLM-0046', patient: 'Robert McLean', phn: '9151 411 009', dos: '2026-07-22', feeItem: '00810', billed: 89.90, paid: 0, status: 'refused', refusalCode: 'C12', refusalReason: 'Provider not registered for this service code' },
    ],
  },
  {
    id: 'RA-2026-07',
    receivedAt: '2026-07-03',
    payPeriod: 'June 2026',
    totalBilled: 5210.00,
    totalPaid: 5160.00,
    lineCount: 44,
    refusalCount: 1,
    lines: [
      { id: 'l10', claimRef: 'CLM-0027', patient: 'James Okafor', phn: '9151 551 228', dos: '2026-06-02', feeItem: '00810', billed: 89.90, paid: 89.90, status: 'paid' },
    ],
  },
];

const STATUS_MAP = {
  paid: { label: 'Paid', cls: 'badge-ok', icon: CheckCircle2 },
  refused: { label: 'Refused', cls: 'badge-danger', icon: XCircle },
  adjusted: { label: 'Adjusted', cls: 'badge-warn', icon: AlertTriangle },
};

export default function RemittancesPage() {
  const [expanded, setExpanded] = useState<string | null>('RA-2026-08');
  const [filter, setFilter] = useState<'all' | 'refused' | 'adjusted'>('all');

  const toggle = (id: string) => setExpanded((x) => (x === id ? null : id));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Remittances</h1>
          <p className="text-[13px] text-white/40 mt-1">Payment advices from MSP — reconcile refusals and adjustments</p>
        </div>
        <button className="btn flex items-center gap-2 text-[13px]">
          <RefreshCw className="w-4 h-4" /> Retrieve from Teleplan
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['all', 'refused', 'adjusted'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-colors',
              filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60')}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {MOCK.map((ra) => {
          const isOpen = expanded === ra.id;
          const lines = filter === 'all' ? ra.lines : ra.lines.filter((l) => l.status === filter);
          const adjPct = ((ra.totalPaid / ra.totalBilled) * 100).toFixed(1);

          return (
            <div key={ra.id} className="card overflow-hidden">
              {/* Header row */}
              <button onClick={() => toggle(ra.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="font-semibold text-white text-[14px]">{ra.payPeriod}</span>
                    <span className="text-[11px] text-white/30">{ra.id}</span>
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5 ml-7">Received {ra.receivedAt}</div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                  <Stat label="Claims" value={ra.lineCount.toString()} />
                  <Stat label="Billed" value={`$${ra.totalBilled.toLocaleString()}`} />
                  <Stat label="Paid" value={`$${ra.totalPaid.toLocaleString()}`} hi />
                  <Stat label="Recovery" value={`${adjPct}%`} warn={parseFloat(adjPct) < 98} />
                  {ra.refusalCount > 0 && (
                    <span className="badge-danger text-[11px] px-2 py-0.5">{ra.refusalCount} refused</span>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                </div>
              </button>

              {/* Line items */}
              {isOpen && (
                <div className="border-t border-white/[0.05]">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-white/30 border-b border-white/[0.05]">
                        {['Ref', 'Patient', 'PHN', 'DOS', 'Item', 'Billed', 'Paid', 'Status'].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => {
                        const st = STATUS_MAP[l.status];
                        const Icon = st.icon;
                        return (
                          <>
                            <tr key={l.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="px-4 py-2.5 text-white/50 font-mono">{l.claimRef}</td>
                              <td className="px-4 py-2.5 text-white/80 font-medium">{l.patient}</td>
                              <td className="px-4 py-2.5 text-white/40 font-mono">{l.phn}</td>
                              <td className="px-4 py-2.5 text-white/50">{l.dos}</td>
                              <td className="px-4 py-2.5 text-white/50 font-mono">{l.feeItem}</td>
                              <td className="px-4 py-2.5 text-white/60">${l.billed.toFixed(2)}</td>
                              <td className="px-4 py-2.5 font-semibold text-white/90">${l.paid.toFixed(2)}</td>
                              <td className="px-4 py-2.5">
                                <span className={cn('flex items-center gap-1', st.cls)}>
                                  <Icon className="w-3 h-3" /> {st.label}
                                </span>
                              </td>
                            </tr>
                            {(l.refusalCode || l.adjustmentNote) && (
                              <tr key={`${l.id}-note`} className="border-b border-white/[0.03] bg-white/[0.01]">
                                <td colSpan={8} className="px-4 pb-2.5 pt-1">
                                  <div className={cn('text-[11px] rounded-lg px-3 py-2 flex items-start gap-2',
                                    l.refusalCode
                                      ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20')}>
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>
                                      {l.refusalCode && <strong className="font-semibold">{l.refusalCode}: </strong>}
                                      {l.refusalReason ?? l.adjustmentNote}
                                    </span>
                                    {l.refusalCode && (
                                      <button className="ml-auto text-red-300 underline shrink-0">Resubmit</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                    <span className="text-[11px] text-white/30">{lines.length} line{lines.length !== 1 ? 's' : ''} shown</span>
                    <button className="btn flex items-center gap-1.5 text-[12px]">
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
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

function Stat({ label, value, hi, warn }: { label: string; value: string; hi?: boolean; warn?: boolean }) {
  return (
    <div className="text-right">
      <div className={cn('text-[14px] font-semibold', hi ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-white/80')}>{value}</div>
      <div className="text-[10px] text-white/30">{label}</div>
    </div>
  );
}

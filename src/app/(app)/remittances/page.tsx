'use client';
import React, { useState } from 'react';
import { Download, RefreshCw, ChevronDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

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
    id: 'RA-2026-08', receivedAt: 'Aug 5, 2026', payPeriod: 'July 2026',
    totalBilled: 4820.00, totalPaid: 4460.00, lineCount: 38, refusalCount: 3,
    lines: [
      { id: 'l1', claimRef: 'CLM-0041', patient: 'Margaret Thompson', phn: '9151210417', dos: '2026-07-14', feeItem: '00810', billed: 89.90, paid: 89.90, status: 'paid' },
      { id: 'l2', claimRef: 'CLM-0042', patient: 'David Park',         phn: '9151220831', dos: '2026-07-15', feeItem: '00810', billed: 89.90, paid: 89.90, status: 'paid' },
      { id: 'l3', claimRef: 'CLM-0043', patient: 'Amara Diallo',       phn: '9999000000', dos: '2026-07-15', feeItem: '00810', billed: 89.90, paid: 0,     status: 'refused',  refusalCode: 'C12', refusalReason: 'PHN not found — verify and resubmit' },
      { id: 'l4', claimRef: 'CLM-0044', patient: 'Chen Wei',           phn: '9151198022', dos: '2026-07-18', feeItem: '00050', billed: 32.15, paid: 28.95, status: 'adjusted', adjustmentNote: 'Fee item paid at lower rate — fee schedule update 2026-07-01' },
      { id: 'l5', claimRef: 'CLM-0045', patient: 'Priya Sharma',       phn: '9151305114', dos: '2026-07-19', feeItem: '00810', billed: 89.90, paid: 89.90, status: 'paid' },
      { id: 'l6', claimRef: 'CLM-0046', patient: 'Robert McLean',      phn: '9151411009', dos: '2026-07-22', feeItem: '00810', billed: 89.90, paid: 0,     status: 'refused',  refusalCode: 'C12', refusalReason: 'Provider not registered for this service code' },
    ],
  },
  {
    id: 'RA-2026-07', receivedAt: 'Jul 3, 2026', payPeriod: 'June 2026',
    totalBilled: 5210.00, totalPaid: 5160.00, lineCount: 44, refusalCount: 1,
    lines: [
      { id: 'l10', claimRef: 'CLM-0027', patient: 'James Okafor', phn: '9151551228', dos: '2026-06-02', feeItem: '00810', billed: 89.90, paid: 89.90, status: 'paid' },
    ],
  },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  paid:     { label: 'Paid',     cls: 'badge b-paid',    icon: CheckCircle2 },
  refused:  { label: 'Refused',  cls: 'badge b-rejected', icon: XCircle },
  adjusted: { label: 'Adjusted', cls: 'badge b-pending',  icon: AlertTriangle },
};

export default function RemittancesPage() {
  const [expanded, setExpanded] = useState<string | null>('RA-2026-08');
  const [lineFilter, setLineFilter] = useState<'all' | 'refused' | 'adjusted'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const totalPaid   = MOCK.reduce((s, r) => s + r.totalPaid, 0);
  const totalBilled = MOCK.reduce((s, r) => s + r.totalBilled, 0);
  const totalFiles  = MOCK.length;
  const totalRefusals = MOCK.reduce((s, r) => s + r.refusalCount, 0);

  function handleRefresh() { setRefreshing(true); setTimeout(() => setRefreshing(false), 1400); }

  return (
    <div style={{ maxWidth: 1040 }}>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'YTD Paid',     value: `$${totalPaid.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`,   color: '#2563eb', bg: '#eff5ff' },
          { label: 'YTD Billed',   value: `$${totalBilled.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'ERA Files',    value: String(totalFiles),                                                         color: '#059669', bg: '#ecfdf5' },
          { label: 'Refusals',     value: String(totalRefusals),                                                      color: '#e11d48', bg: '#fff1f3' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="stico" style={{ background: s.bg, margin: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '.7rem', color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: '1.5rem', fontWeight: 400, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--t1)' }}>ERA Files</div>
        <button className="btn btn-s btn-sm" onClick={handleRefresh}>
          <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          {refreshing ? 'Fetching…' : 'Fetch Latest'}
        </button>
      </div>

      {/* ERA list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MOCK.map((r) => {
          const isOpen = expanded === r.id;
          const adjPct = ((r.totalPaid / r.totalBilled) * 100).toFixed(1);
          const visibleLines = r.lines.filter(l => lineFilter === 'all' || l.status === lineFilter);

          return (
            <div key={r.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Header row */}
              <div
                onClick={() => setExpanded(isOpen ? null : r.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: '.82rem', fontWeight: 600, color: 'var(--sky-dk)' }}>{r.id}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--t4)' }}>{r.payPeriod}</span>
                    {r.refusalCount > 0 && (
                      <span className="badge b-rejected">{r.refusalCount} refused</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: '.66rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Paid</div>
                      <div style={{ fontFamily: 'var(--ff)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--ok)', lineHeight: 1 }}>${r.totalPaid.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.66rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Billed</div>
                      <div style={{ fontFamily: 'var(--ff)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--t2)', lineHeight: 1 }}>${r.totalBilled.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.66rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Lines</div>
                      <div style={{ fontFamily: 'var(--ff)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--t2)', lineHeight: 1 }}>{r.lineCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.66rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pay rate</div>
                      <div style={{ fontFamily: 'var(--ff)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--sky-dk)', lineHeight: 1 }}>{adjPct}%</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--t4)' }}>Received {r.receivedAt}</span>
                  <button className="btn btn-s btn-sm" onClick={e => e.stopPropagation()}>
                    <Download size={13} /> Download
                  </button>
                  <ChevronDown size={16} style={{ color: 'var(--t4)', transition: 'transform .15s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                </div>
              </div>

              {/* Pay progress bar */}
              <div style={{ padding: '0 22px' }}>
                <div className="prog" style={{ marginBottom: isOpen ? 0 : 18 }}>
                  <div className="prog-fill" style={{ width: `${adjPct}%`, background: r.refusalCount > 0 ? 'linear-gradient(90deg,#059669,#d97706)' : 'var(--grad-1)' }} />
                </div>
              </div>

              {/* Lines detail */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--bd)', padding: '16px 22px' }}>
                  <div className="fpills" style={{ marginBottom: 14 }}>
                    {(['all', 'refused', 'adjusted'] as const).map((f) => (
                      <button key={f} className={`fpill${lineFilter === f ? ' active' : ''}`} onClick={() => setLineFilter(f)}>
                        {f === 'all' ? 'All lines' : f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="fpill-count">{f === 'all' ? r.lines.length : r.lines.filter(l => l.status === f).length}</span>
                      </button>
                    ))}
                  </div>
                  <div className="tw">
                    <table>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Claim</th>
                          <th>DoS</th>
                          <th>Fee Item</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Billed</th>
                          <th style={{ textAlign: 'right' }}>Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLines.map((l) => {
                          const cfg = STATUS_CONFIG[l.status];
                          return (
                            <React.Fragment key={l.id}>
                              <tr>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{l.patient}</div>
                                  <div style={{ fontSize: '.72rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{l.phn}</div>
                                </td>
                                <td><span className="mono" style={{ color: 'var(--sky-dk)' }}>{l.claimRef}</span></td>
                                <td style={{ color: 'var(--t3)', fontSize: '.82rem' }}>{l.dos}</td>
                                <td><span className="code-chip">{l.feeItem}</span></td>
                                <td><span className={cfg.cls}>{cfg.label}</span></td>
                                <td style={{ textAlign: 'right', color: 'var(--t2)' }}>${l.billed.toFixed(2)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: l.status === 'refused' ? 'var(--bad)' : 'var(--ok)' }}>${l.paid.toFixed(2)}</td>
                              </tr>
                              {(l.refusalReason || l.adjustmentNote) && (
                                <tr>
                                  <td colSpan={7} style={{ padding: '4px 14px 12px', background: 'var(--n50)' }}>
                                    <div className={`alrt${l.status === 'refused' ? ' al-err' : ' al-warn'}`} style={{ margin: 0 }}>
                                      {l.status === 'refused'
                                        ? <><XCircle size={13} className="alrt-ico" /> <strong>{l.refusalCode}:</strong> {l.refusalReason}</>
                                        : <><AlertTriangle size={13} className="alrt-ico" /> {l.adjustmentNote}</>}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
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

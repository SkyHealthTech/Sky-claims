'use client';
import React, { useState, useMemo } from 'react';
import { Download, RefreshCw, ChevronDown, CheckCircle2, XCircle, AlertTriangle, Globe, RotateCcw } from 'lucide-react';

// ── Province billing systems ──────────────────────────────────────────────────
const PROVINCE_SYSTEMS: Record<string, { name: string; color: string }> = {
  BC: { name: 'Teleplan / MSP',     color: '#059669' },
  ON: { name: 'OHIP / eClaims',     color: '#2563eb' },
  AB: { name: 'AHCIP / Netcare',    color: '#7c3aed' },
  MB: { name: 'MHSAL',              color: '#0891b2' },
  SK: { name: 'SK Health',          color: '#d97706' },
  QC: { name: 'RAMQ',               color: '#dc2626' },
  NS: { name: 'MSI / Medavie',      color: '#0284c7' },
  NB: { name: 'Medicare NB',        color: '#65a30d' },
  NL: { name: 'MCP',                color: '#7c3aed' },
  PE: { name: 'PEI Health',         color: '#ea580c' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
type RemittLine = {
  id: string; claimRef: string; patient: string; phn: string; dos: string;
  feeItem: string; billed: number; paid: number; status: 'paid' | 'refused' | 'adjusted';
  refusalCode?: string; refusalReason?: string; adjustmentNote?: string;
};
type Remittance = {
  id: string; receivedAt: string; payPeriod: string; totalBilled: number;
  totalPaid: number; lineCount: number; refusalCount: number;
  province: string; lines: RemittLine[];
};

// ── Mock ERA data ─────────────────────────────────────────────────────────────
const MOCK: Remittance[] = [
  {
    id: 'RA-BC-2026-08', receivedAt: 'Aug 5, 2026', payPeriod: 'July 2026',
    province: 'BC', totalBilled: 4820.00, totalPaid: 4460.00, lineCount: 38, refusalCount: 3,
    lines: [
      { id: 'l1', claimRef: 'CLM-0041', patient: 'Margaret Thompson', phn: '9151210417', dos: '2026-07-14', feeItem: '00110', billed: 88.35, paid: 88.35, status: 'paid' },
      { id: 'l2', claimRef: 'CLM-0042', patient: 'David Park',         phn: '9151220831', dos: '2026-07-15', feeItem: '00110', billed: 88.35, paid: 88.35, status: 'paid' },
      { id: 'l3', claimRef: 'CLM-0043', patient: 'Amara Diallo',       phn: '9999000000', dos: '2026-07-15', feeItem: '00110', billed: 88.35, paid: 0,     status: 'refused',  refusalCode: 'C12', refusalReason: 'PHN not found — verify and resubmit' },
      { id: 'l4', claimRef: 'CLM-0044', patient: 'Chen Wei',           phn: '9151198022', dos: '2026-07-18', feeItem: '00050', billed: 32.15, paid: 28.95, status: 'adjusted', adjustmentNote: 'Fee item paid at lower rate — fee schedule update 2026-07-01' },
      { id: 'l5', claimRef: 'CLM-0045', patient: 'Priya Sharma',       phn: '9151305114', dos: '2026-07-19', feeItem: '00110', billed: 88.35, paid: 88.35, status: 'paid' },
      { id: 'l6', claimRef: 'CLM-0046', patient: 'Robert McLean',      phn: '9151411009', dos: '2026-07-22', feeItem: '00110', billed: 88.35, paid: 0,     status: 'refused',  refusalCode: 'E01', refusalReason: 'Provider not registered for this service code' },
    ],
  },
  {
    id: 'RA-BC-2026-07', receivedAt: 'Jul 3, 2026', payPeriod: 'June 2026',
    province: 'BC', totalBilled: 5210.00, totalPaid: 5160.00, lineCount: 44, refusalCount: 1,
    lines: [
      { id: 'l10', claimRef: 'CLM-0027', patient: 'James Okafor',    phn: '9151551228', dos: '2026-06-02', feeItem: '00110', billed: 88.35, paid: 88.35, status: 'paid' },
      { id: 'l11', claimRef: 'CLM-0028', patient: 'Lisa Beaumont',   phn: '9151551230', dos: '2026-06-05', feeItem: '00110', billed: 88.35, paid: 0,     status: 'refused',  refusalCode: 'C50', refusalReason: 'Service not covered for patient age group' },
    ],
  },
  {
    id: 'RA-ON-2026-08', receivedAt: 'Aug 18, 2026', payPeriod: 'July 2026',
    province: 'ON', totalBilled: 1820.00, totalPaid: 1820.00, lineCount: 32, refusalCount: 0,
    lines: [
      { id: 'l20', claimRef: 'CLM-0038', patient: 'Robert Chan',     phn: '8291004512', dos: '2026-07-11', feeItem: 'A001A', billed: 38.05, paid: 38.05, status: 'paid' },
      { id: 'l21', claimRef: 'CLM-0039', patient: 'Ying-Ying Wu',    phn: '8291091230', dos: '2026-07-09', feeItem: 'K013',  billed: 30.15, paid: 30.15, status: 'paid' },
    ],
  },
  {
    id: 'RA-AB-2026-08', receivedAt: 'Aug 21, 2026', payPeriod: 'July 2026',
    province: 'AB', totalBilled: 680.00, totalPaid: 640.25, lineCount: 14, refusalCount: 1,
    lines: [
      { id: 'l30', claimRef: 'CLM-0036', patient: 'Michael Torres',  phn: '5821019944', dos: '2026-07-10', feeItem: '03.01A', billed: 39.65, paid: 39.65, status: 'paid' },
      { id: 'l31', claimRef: 'CLM-0035', patient: 'Sunita Patel',    phn: '5821033102', dos: '2026-07-08', feeItem: '03.01A', billed: 39.65, paid: 0,     status: 'refused',  refusalCode: 'A30', refusalReason: 'Billing practitioner not registered in AHCIP' },
    ],
  },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  paid:     { label: 'Paid',     cls: 'badge b-paid',     icon: CheckCircle2 },
  refused:  { label: 'Refused',  cls: 'badge b-rejected', icon: XCircle },
  adjusted: { label: 'Adjusted', cls: 'badge b-pending',  icon: AlertTriangle },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function RemittancesPage() {
  const [expanded, setExpanded]   = useState<string | null>('RA-BC-2026-08');
  const [lineFilter, setLineFilter] = useState<'all' | 'refused' | 'adjusted'>('all');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() =>
    provinceFilter === 'all' ? MOCK : MOCK.filter((r) => r.province === provinceFilter),
  [provinceFilter]);

  const totalPaid     = filtered.reduce((s, r) => s + r.totalPaid, 0);
  const totalBilled   = filtered.reduce((s, r) => s + r.totalBilled, 0);
  const totalFiles    = filtered.length;
  const totalRefusals = filtered.reduce((s, r) => s + r.refusalCount, 0);
  const payRate       = totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : '—';

  function handleRefresh() { setRefreshing(true); setTimeout(() => setRefreshing(false), 1400); }

  return (
    <>
      {/* ── Remittances hero ────────────────────────────────────────────────── */}
      <div className="claims-hero" style={{ marginBottom: 24 }}>
        <div className="ch-inner">
          <div className="ch-l">
            <div className="ch-eyebrow">Electronic Remittance Advice · All Provincial Plans</div>
            <div className="ch-title">Remittances</div>
            <div className="ch-sub">
              ERA files from Teleplan, OHIP, AHCIP, RAMQ, MCP and all provincial billing systems — auto-matched to submitted claims.
            </div>
          </div>
          <div className="ch-stats">
            <div>
              <div className="ch-stat-lbl">YTD Paid</div>
              <div className="ch-stat-val">
                ${MOCK.reduce((s, r) => s + r.totalPaid, 0).toLocaleString('en-CA', { minimumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="ch-stat-lbl">Pay Rate</div>
              <div className="ch-stat-val">{payRate}%</div>
            </div>
            <div>
              <div className="ch-stat-lbl">ERA Files</div>
              <div className="ch-stat-val">{MOCK.length}</div>
            </div>
          </div>
          <button className="btn btn-on-hero" onClick={handleRefresh}>
            <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            {refreshing ? 'Fetching…' : 'Fetch Latest'}
          </button>
        </div>
      </div>

      {/* ── Summary stat cards ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Paid',   value: `$${totalPaid.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`,   color: '#059669', bg: '#ecfdf5' },
          { label: 'Total Billed', value: `$${totalBilled.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'ERA Files',    value: String(totalFiles),                                                        color: '#2563eb', bg: '#eff5ff' },
          { label: 'Refusals',     value: String(totalRefusals),                                                     color: '#e11d48', bg: '#fff1f3' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '.7rem', color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '1.4rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--t1)', flex: 1 }}>ERA Files</span>
        <div style={{ position: 'relative' }}>
          <Globe size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)', pointerEvents: 'none' }} />
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            style={{
              paddingLeft: 28, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: 'var(--wh)', border: '1px solid var(--bd2)', borderRadius: 10,
              fontSize: '.82rem', fontWeight: 600, color: 'var(--t1)', outline: 'none',
              cursor: 'pointer', fontFamily: 'var(--ff)',
            }}
          >
            <option value="all">All Provinces</option>
            {Object.entries(PROVINCE_SYSTEMS).map(([code, sys]) => (
              <option key={code} value={code}>{code} — {sys.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Province summary chips (when showing all) ────────────────────────── */}
      {provinceFilter === 'all' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(
            MOCK.reduce<Record<string, number>>((acc, r) => {
              acc[r.province] = (acc[r.province] ?? 0) + r.totalPaid;
              return acc;
            }, {})
          ).map(([code, paid]) => {
            const sys = PROVINCE_SYSTEMS[code];
            return (
              <button
                key={code}
                onClick={() => setProvinceFilter(code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 12px', borderRadius: 20,
                  background: `${sys?.color ?? '#7c3aed'}12`,
                  border: `1px solid ${sys?.color ?? '#7c3aed'}28`,
                  cursor: 'pointer', fontFamily: 'var(--ff)',
                }}
              >
                <span style={{ fontSize: '.7rem', fontWeight: 800, color: sys?.color ?? 'var(--lilac)' }}>{code}</span>
                <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--t2)' }}>
                  ${paid.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── ERA list ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--t4)' }}>
            No ERA files found for {provinceFilter}.
          </div>
        )}
        {filtered.map((r) => {
          const sys = PROVINCE_SYSTEMS[r.province];
          const isOpen = expanded === r.id;
          const adjPct = ((r.totalPaid / r.totalBilled) * 100).toFixed(1);
          const visibleLines = r.lines.filter((l) =>
            lineFilter === 'all' || l.status === lineFilter
          );

          return (
            <div key={r.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Header row */}
              <div
                onClick={() => setExpanded(isOpen ? null : r.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: '.82rem', fontWeight: 600, color: 'var(--lilac)' }}>{r.id}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--t4)' }}>{r.payPeriod}</span>
                    <span style={{
                      fontSize: '.7rem', fontWeight: 700, color: sys?.color ?? 'var(--lilac)',
                      background: `${sys?.color ?? '#7c3aed'}14`,
                      borderRadius: 6, padding: '2px 7px',
                    }}>{r.province} · {sys?.name}</span>
                    {r.refusalCount > 0 && (
                      <span className="badge b-rejected">{r.refusalCount} refused</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Paid',     value: `$${r.totalPaid.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`,   color: 'var(--ok)' },
                      { label: 'Billed',   value: `$${r.totalBilled.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`, color: 'var(--t2)' },
                      { label: 'Lines',    value: String(r.lineCount),                                                         color: 'var(--t2)' },
                      { label: 'Pay rate', value: `${adjPct}%`,                                                                color: 'var(--lilac)' },
                    ].map((m) => (
                      <div key={m.label}>
                        <div style={{ fontSize: '.63rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{m.label}</div>
                        <div style={{ fontFamily: 'var(--fm)', fontSize: '1.2rem', fontWeight: 700, color: m.color, lineHeight: 1.1, marginTop: 2 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '.75rem', color: 'var(--t4)', whiteSpace: 'nowrap' }}>Received {r.receivedAt}</span>
                  <button className="btn btn-s btn-sm" onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Download size={13} /> Download
                  </button>
                  <ChevronDown size={16} style={{
                    color: 'var(--t4)', transition: 'transform .15s',
                    transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0,
                  }} />
                </div>
              </div>

              {/* Pay progress bar */}
              <div style={{ padding: '0 22px' }}>
                <div className="prog" style={{ marginBottom: isOpen ? 0 : 18 }}>
                  <div className="prog-fill" style={{
                    width: `${adjPct}%`,
                    background: r.refusalCount > 0
                      ? `linear-gradient(90deg, ${sys?.color ?? '#059669'}, #d97706)`
                      : `linear-gradient(90deg, ${sys?.color ?? '#059669'}, ${sys?.color ?? '#059669'}cc)`,
                  }} />
                </div>
              </div>

              {/* Lines detail */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--bd)', padding: '16px 22px' }}>
                  <div className="fpills" style={{ marginBottom: 14 }}>
                    {(['all', 'refused', 'adjusted'] as const).map((f) => (
                      <button key={f} className={`fpill${lineFilter === f ? ' active' : ''}`} onClick={() => setLineFilter(f)}>
                        {f === 'all' ? 'All lines' : f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="fpill-count">
                          {f === 'all' ? r.lines.length : r.lines.filter((l) => l.status === f).length}
                        </span>
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
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLines.length === 0 && (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'var(--t4)', fontSize: '.84rem' }}>
                              No {lineFilter} lines in this ERA.
                            </td>
                          </tr>
                        )}
                        {visibleLines.map((l) => {
                          const cfg = STATUS_CONFIG[l.status];
                          return (
                            <React.Fragment key={l.id}>
                              <tr>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{l.patient}</div>
                                  <div style={{ fontSize: '.72rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{l.phn}</div>
                                </td>
                                <td>
                                  <span style={{ fontFamily: 'var(--fm)', fontSize: '.78rem', color: 'var(--lilac)', fontWeight: 600 }}>
                                    {l.claimRef}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--t3)', fontSize: '.82rem' }}>{l.dos}</td>
                                <td><span className="code-chip">{l.feeItem}</span></td>
                                <td><span className={cfg.cls}>{cfg.label}</span></td>
                                <td style={{ textAlign: 'right', color: 'var(--t2)', fontFamily: 'var(--fm)', fontSize: '.82rem' }}>
                                  ${l.billed.toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--fm)', fontSize: '.82rem',
                                  color: l.status === 'refused' ? 'var(--bad)' : 'var(--ok)' }}>
                                  ${l.paid.toFixed(2)}
                                </td>
                                <td>
                                  {l.status === 'refused' && (
                                    <button className="btn btn-s btn-xs"
                                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.7rem', whiteSpace: 'nowrap' }}>
                                      <RotateCcw size={11} /> Resubmit
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {(l.refusalReason || l.adjustmentNote) && (
                                <tr>
                                  <td colSpan={8} style={{ padding: '4px 14px 12px', background: 'var(--n50)' }}>
                                    <div className={`alrt${l.status === 'refused' ? ' al-err' : ' al-warn'}`} style={{ margin: 0 }}>
                                      <span className="alrt-ico">
                                        {l.status === 'refused' ? <XCircle size={13} /> : <AlertTriangle size={13} />}
                                      </span>
                                      {l.status === 'refused'
                                        ? <><strong>{l.refusalCode}:</strong> {l.refusalReason}</>
                                        : l.adjustmentNote}
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

                  {/* Footer total row */}
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: 24,
                    padding: '12px 14px 0', borderTop: '1px solid var(--bd)', marginTop: 12,
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.65rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Billed</div>
                      <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--t2)' }}>
                        ${r.totalBilled.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.65rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Paid</div>
                      <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--ok)' }}>
                        ${r.totalPaid.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.65rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pay Rate</div>
                      <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: sys?.color ?? 'var(--lilac)' }}>{adjPct}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  Download, RefreshCw, ChevronDown, CheckCircle2, XCircle,
  AlertTriangle, Globe, RotateCcw, Receipt,
} from 'lucide-react';
import type { RemittRow } from '@/lib/dal';

const PROVINCE_SYSTEMS: Record<string, { name: string; color: string }> = {
  BC: { name: 'Teleplan / MSP',   color: '#059669' },
  ON: { name: 'OHIP / MCEDT',    color: '#8b5cf6' },
  AB: { name: 'AHCIP / H-Link',  color: '#7c3aed' },
  MB: { name: 'EPiCS',            color: '#0891b2' },
  SK: { name: 'SK Health',        color: '#d97706' },
  QC: { name: 'RAMQ',             color: '#dc2626' },
  NS: { name: 'MSI / Medavie',   color: '#0284c7' },
  NB: { name: 'Medicare NB',      color: '#65a30d' },
  NL: { name: 'MCP',              color: '#7c3aed' },
  PE: { name: 'PEI Health',       color: '#ea580c' },
};

type RemittLine = {
  id: string; claimRef: string; patient: string; phn: string; dos: string;
  feeItem: string; billed: number; paid: number;
  status: 'paid' | 'refused' | 'adjusted';
  refusalCode?: string; refusalReason?: string; adjustmentNote?: string;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  paid:     { label: 'Paid',     cls: 'badge b-paid'     },
  refused:  { label: 'Refused',  cls: 'badge b-rejected' },
  adjusted: { label: 'Adjusted', cls: 'badge b-pending'  },
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RemittancesClient({ remittances }: { remittances: RemittRow[] }) {
  const [expanded, setExpanded]     = useState<string | null>(remittances[0]?.id ?? null);
  const [lineFilter, setLineFilter] = useState<'all' | 'refused' | 'adjusted'>('all');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() =>
    provinceFilter === 'all' ? remittances : remittances.filter(r => r.province === provinceFilter),
  [provinceFilter, remittances]);

  const totalPaid     = filtered.reduce((s, r) => s + (r.total_paid ?? 0), 0);
  const totalClaims   = filtered.reduce((s, r) => s + (r.total_claims ?? 0), 0);
  const totalFiles    = filtered.length;
  const totalRejected = filtered.reduce((s, r) => s + (r.total_rejected ?? 0), 0);

  // Extract lines from raw_data if available
  function getLines(r: RemittRow): RemittLine[] {
    const raw = r.raw_data as { lines?: RemittLine[] } | null;
    return raw?.lines ?? [];
  }

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1400);
  }

  // Empty state
  if (remittances.length === 0) {
    return (
      <>
        <div className="claims-hero" style={{ marginBottom: 24 }}>
          <div className="ch-inner">
            <div className="ch-l">
              <div className="ch-eyebrow">Electronic Remittance Advice · All Provincial Plans</div>
              <div className="ch-title">Remittances</div>
              <div className="ch-sub">
                ERA files from Teleplan, OHIP, AHCIP, RAMQ, MCP and all provincial billing systems — auto-matched to submitted claims.
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="empty-ico" style={{ display: 'inline-flex', marginBottom: 16 }}>
            <Receipt size={26} style={{ color: 'var(--t4)' }}/>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--t2)', marginBottom: 8 }}>
            No ERA files yet
          </div>
          <div style={{ fontSize: '.84rem', color: 'var(--t3)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
            Remittance Advice files are received after claims are adjudicated by the provincial billing system.
            Once Teleplan or your provincial plan processes submitted claims, ERA files will appear here automatically.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
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
              <div className="ch-stat-lbl">Total Paid</div>
              <div className="ch-stat-val">
                ${totalPaid.toLocaleString('en-CA', { minimumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="ch-stat-lbl">ERA Files</div>
              <div className="ch-stat-val">{totalFiles}</div>
            </div>
            <div>
              <div className="ch-stat-lbl">Total Claims</div>
              <div className="ch-stat-val">{totalClaims}</div>
            </div>
          </div>
          <button className="btn btn-on-hero" onClick={handleRefresh}>
            <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}/>
            {refreshing ? 'Fetching…' : 'Fetch Latest'}
          </button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Paid',    value: `$${totalPaid.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`,    color: '#059669', bg: '#ecfdf5' },
          { label: 'Total Claims',  value: String(totalClaims),                                                         color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'ERA Files',     value: String(totalFiles),                                                          color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Rejected',      value: String(totalRejected),                                                       color: '#e11d48', bg: '#fff1f3' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }}/>
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
          <Globe size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)', pointerEvents: 'none' }}/>
          <select
            value={provinceFilter}
            onChange={e => setProvinceFilter(e.target.value)}
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

      {/* Province chips */}
      {provinceFilter === 'all' && (() => {
        const byProvince = remittances.reduce<Record<string, number>>((acc, r) => {
          acc[r.province] = (acc[r.province] ?? 0) + (r.total_paid ?? 0);
          return acc;
        }, {});
        return Object.keys(byProvince).length > 0 ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(byProvince).map(([code, paid]) => {
              const sys = PROVINCE_SYSTEMS[code];
              return (
                <button key={code} onClick={() => setProvinceFilter(code)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px',
                  borderRadius: 20, background: `${sys?.color ?? '#7c3aed'}12`,
                  border: `1px solid ${sys?.color ?? '#7c3aed'}28`, cursor: 'pointer', fontFamily: 'var(--ff)',
                }}>
                  <span style={{ fontSize: '.7rem', fontWeight: 800, color: sys?.color ?? 'var(--lilac)' }}>{code}</span>
                  <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--t2)' }}>
                    ${paid.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null;
      })()}

      {/* ── ERA list ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--t4)' }}>
            No ERA files found for {provinceFilter}.
          </div>
        )}
        {filtered.map(r => {
          const sys = PROVINCE_SYSTEMS[r.province];
          const isOpen = expanded === r.id;
          const totalBilled  = (r.total_paid ?? 0) + (r.total_rejected ?? 0) + (r.total_held ?? 0);
          const payRate      = totalBilled > 0 ? ((r.total_paid ?? 0) / totalBilled * 100).toFixed(1) : '100.0';
          const lines        = getLines(r);
          const visibleLines = lines.filter(l => lineFilter === 'all' || l.status === lineFilter);

          return (
            <div key={r.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div
                onClick={() => setExpanded(isOpen ? null : r.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: '.82rem', fontWeight: 600, color: 'var(--lilac)' }}>
                      ERA-{r.province}-{fmtDate(r.remittance_date).replace(/\s/g, '-')}
                    </span>
                    {r.period_start && (
                      <span style={{ fontSize: '.72rem', color: 'var(--t4)' }}>
                        {fmtDate(r.period_start)} — {fmtDate(r.period_end)}
                      </span>
                    )}
                    <span style={{
                      fontSize: '.7rem', fontWeight: 700, color: sys?.color ?? 'var(--lilac)',
                      background: `${sys?.color ?? '#7c3aed'}14`, borderRadius: 6, padding: '2px 7px',
                    }}>{r.province} · {sys?.name ?? 'Provincial'}</span>
                    {(r.total_rejected ?? 0) > 0 && (
                      <span className="badge b-rejected">{r.total_rejected} refused</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Paid',      value: `$${(r.total_paid ?? 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`,  color: 'var(--ok)' },
                      { label: 'Rejected',  value: String(r.total_rejected ?? 0),                                                       color: '#e11d48'   },
                      { label: 'Claims',    value: String(r.total_claims ?? 0),                                                         color: 'var(--t2)' },
                      { label: 'Pay rate',  value: `${payRate}%`,                                                                       color: sys?.color ?? 'var(--lilac)' },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontSize: '.63rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{m.label}</div>
                        <div style={{ fontFamily: 'var(--fm)', fontSize: '1.2rem', fontWeight: 700, color: m.color, lineHeight: 1.1, marginTop: 2 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '.75rem', color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                    Received {fmtDate(r.remittance_date)}
                  </span>
                  <button className="btn btn-s btn-sm" onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Download size={13}/> Download
                  </button>
                  <ChevronDown size={16} style={{
                    color: 'var(--t4)', transition: 'transform .15s',
                    transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0,
                  }}/>
                </div>
              </div>

              {/* Pay progress */}
              <div style={{ padding: '0 22px' }}>
                <div className="prog" style={{ marginBottom: isOpen ? 0 : 18 }}>
                  <div className="prog-fill" style={{
                    width: `${payRate}%`,
                    background: (r.total_rejected ?? 0) > 0
                      ? `linear-gradient(90deg, ${sys?.color ?? '#059669'}, #d97706)`
                      : `linear-gradient(90deg, ${sys?.color ?? '#059669'}, ${sys?.color ?? '#059669'}cc)`,
                  }}/>
                </div>
              </div>

              {/* Lines detail */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--bd)', padding: '16px 22px' }}>
                  {lines.length > 0 ? (
                    <>
                      <div className="fpills" style={{ marginBottom: 14 }}>
                        {(['all', 'refused', 'adjusted'] as const).map(f => (
                          <button key={f} className={`fpill${lineFilter === f ? ' active' : ''}`} onClick={() => setLineFilter(f)}>
                            {f === 'all' ? 'All lines' : f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="fpill-count">
                              {f === 'all' ? lines.length : lines.filter(l => l.status === f).length}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="tw">
                        <table>
                          <thead>
                            <tr>
                              <th>Patient</th><th>Claim</th><th>DoS</th>
                              <th>Fee Item</th><th>Status</th>
                              <th style={{ textAlign: 'right' }}>Billed</th>
                              <th style={{ textAlign: 'right' }}>Paid</th>
                              <th/>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleLines.length === 0 && (
                              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--t4)', fontSize: '.84rem' }}>No {lineFilter} lines in this ERA.</td></tr>
                            )}
                            {visibleLines.map(l => {
                              const cfg = STATUS_CONFIG[l.status];
                              return (
                                <Fragment key={l.id}>
                                  <tr>
                                    <td>
                                      <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{l.patient}</div>
                                      <div style={{ fontSize: '.72rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{l.phn}</div>
                                    </td>
                                    <td><span style={{ fontFamily: 'var(--fm)', fontSize: '.78rem', color: 'var(--lilac)', fontWeight: 600 }}>{l.claimRef}</span></td>
                                    <td style={{ color: 'var(--t3)', fontSize: '.82rem' }}>{l.dos}</td>
                                    <td><span className="code-chip">{l.feeItem}</span></td>
                                    <td><span className={cfg?.cls ?? 'badge b-draft'}>{cfg?.label ?? l.status}</span></td>
                                    <td style={{ textAlign: 'right', color: 'var(--t2)', fontFamily: 'var(--fm)', fontSize: '.82rem' }}>${l.billed.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--fm)', fontSize: '.82rem', color: l.status === 'refused' ? 'var(--bad)' : 'var(--ok)' }}>${l.paid.toFixed(2)}</td>
                                    <td>
                                      {l.status === 'refused' && (
                                        <button className="btn btn-s btn-xs" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.7rem', whiteSpace: 'nowrap' }}>
                                          <RotateCcw size={11}/> Resubmit
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                  {(l.refusalReason || l.adjustmentNote) && (
                                    <tr>
                                      <td colSpan={8} style={{ padding: '4px 14px 12px', background: 'var(--n50)' }}>
                                        <div className={`alrt${l.status === 'refused' ? ' al-err' : ' al-warn'}`} style={{ margin: 0 }}>
                                          {l.status === 'refused' ? <XCircle size={13} className="alrt-ico"/> : <AlertTriangle size={13} className="alrt-ico"/>}
                                          {l.status === 'refused'
                                            ? <><strong>{l.refusalCode}:</strong> {l.refusalReason}</>
                                            : l.adjustmentNote}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="alrt al-info">
                      <CheckCircle2 size={14} className="alrt-ico"/>
                      Line-level detail for this ERA is not yet available. Summary totals are shown above.
                      Re-fetch or contact Teleplan support to obtain a detailed ERA file.
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '12px 14px 0', borderTop: '1px solid var(--bd)', marginTop: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.65rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Paid</div>
                      <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--ok)' }}>
                        ${(r.total_paid ?? 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    {(r.total_held ?? 0) > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '.65rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Held</div>
                        <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--warn)' }}>
                          ${(r.total_held ?? 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.65rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pay Rate</div>
                      <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: sys?.color ?? 'var(--lilac)' }}>{payRate}%</div>
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

'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, AlertCircle, CheckCircle2, Clock, FileText,
  ChevronRight, RotateCcw, Download, LayoutGrid, List,
  Send, Trash2, AlertTriangle,
} from 'lucide-react';
import type { ClaimRow, ClaimStats } from '@/lib/dal';
import { submitClaims, deleteClaim } from '@/lib/actions/claims';

// ── Province styling ──────────────────────────────────────────────────────────
const PROV_COLOR: Record<string, string> = {
  BC: '#059669', AB: '#d97706', ON: '#8b5cf6', MB: '#0891b2',
  SK: '#b45309', QC: '#dc2626', NS: '#0284c7', NB: '#65a30d', NL: '#7c3aed', PE: '#ea580c',
};
const PROV_SYSTEM: Record<string, string> = {
  BC: 'Teleplan', AB: 'H-Link', ON: 'MCEDT', MB: 'EPiCS', SK: 'SK Health',
  QC: 'RAMQ', NS: 'MSI', NB: 'Medicare NB', NL: 'MCP', PE: 'PEI Health',
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  paid:      { label: 'Paid',      cls: 'badge b-paid',      icon: CheckCircle2 },
  submitted: { label: 'Submitted', cls: 'badge b-submitted',  icon: Clock },
  refused:   { label: 'Refused',   cls: 'badge b-rejected',   icon: AlertCircle },
  draft:     { label: 'Draft',     cls: 'badge b-draft',      icon: FileText },
  pending:   { label: 'Pending',   cls: 'badge b-pending',    icon: Clock },
};

const FILTERS = [
  { key: 'all',       label: 'All',       dot: '#94a3b8' },
  { key: 'draft',     label: 'Draft',     dot: '#94a3b8' },
  { key: 'submitted', label: 'Submitted', dot: '#8b5cf6' },
  { key: 'paid',      label: 'Paid',      dot: '#059669' },
  { key: 'refused',   label: 'Refused',   dot: '#e11d48' },
] as const;

function fmt$(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Kanban card ───────────────────────────────────────────────────────────────
function KanbanCard({ claim, onSelect, selected }: {
  claim: ClaimRow;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  const cfg = STATUS_CFG[claim.status] ?? STATUS_CFG.draft;
  const feeCode = (claim.fee_codes as { code: string }[])[0]?.code ?? '—';
  const provColor = PROV_COLOR[claim.province] ?? 'var(--sky)';

  return (
    <div
      className="kcard"
      onClick={() => onSelect(claim.id)}
      style={{ borderColor: selected ? 'var(--sky)' : undefined, background: selected ? 'var(--sky-lt)' : undefined }}
    >
      <div className="kcard-h">
        <span className="kcard-id">CLM-{claim.id.slice(0, 6).toUpperCase()}</span>
        <span className="kcard-amt">{fmt$(claim.subtotal)}</span>
      </div>
      <div className="kcard-p">
        <div>
          <div className="kcard-pn">{claim.patient_name || 'Unnamed patient'}</div>
          <div className="kcard-pm">{claim.health_card_no}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <span className="code-chip">{feeCode}</span>
        {claim.diagnosis_code && <span className="icd-chip">{claim.diagnosis_code}</span>}
        <span style={{ fontWeight: 700, fontSize: '.7rem', padding: '2px 8px', borderRadius: 20, background: provColor + '14', color: provColor }}>{claim.province}</span>
      </div>
      {claim.rejection_reason && (
        <div style={{ fontSize: '.74rem', color: '#b91c1c', background: '#fff1f3', border: '1px solid #fecdd3', borderRadius: 8, padding: '6px 9px', marginBottom: 8, lineHeight: 1.4 }}>
          ⚠ {claim.rejection_reason}
        </div>
      )}
      <div className="kcard-meta">
        <span>{fmtDate(claim.service_date)}</span>
        <span className={cfg.cls} style={{ fontSize: '.66rem', padding: '2px 7px' }}>{cfg.label}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  initialClaims: ClaimRow[];
  stats: ClaimStats;
  initialStatus: string;
  initialQ: string;
}

export default function ClaimsClient({ initialClaims, stats, initialStatus, initialQ }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [q, setQ] = useState(initialQ);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');

  // Client-side filter by search query
  const claims = useMemo(() => {
    const base = statusFilter === 'all'
      ? initialClaims
      : initialClaims.filter(c => c.status === statusFilter);

    if (!q.trim()) return base;
    const lq = q.toLowerCase();
    return base.filter(c =>
      (c.patient_name ?? '').toLowerCase().includes(lq) ||
      c.health_card_no.includes(lq) ||
      (c.diagnosis_code ?? '').toLowerCase().includes(lq) ||
      (c.claim_note ?? '').toLowerCase().includes(lq),
    );
  }, [initialClaims, statusFilter, q]);

  const draftClaims = claims.filter(c => c.status === 'draft');
  const allDraftIds = draftClaims.map(c => c.id);
  const selectedArr = Array.from(selected);

  function handleFilterChange(key: string) {
    setStatusFilter(key);
    setSelected(new Set());
    startTransition(() => {
      const params = new URLSearchParams({ status: key });
      if (q) params.set('q', q);
      router.replace(`/claims?${params}`);
    });
  }

  function toggleSelect(id: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === draftClaims.length) setSelected(new Set());
    else setSelected(new Set(allDraftIds));
  }

  async function handleBatchSubmit() {
    const ids = selectedArr.length > 0 ? selectedArr : allDraftIds;
    if (!ids.length) return;
    setBatchLoading(true); setBatchError('');
    const result = await submitClaims(ids);
    setBatchLoading(false);
    if (result.error) { setBatchError(result.error); return; }
    setSelected(new Set());
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft claim?')) return;
    await deleteClaim(id);
    router.refresh();
  }

  // Kanban columns
  const kanbanCols: { status: string; label: string; color: string; claims: ClaimRow[] }[] = [
    { status: 'draft',     label: 'Draft',     color: '#94a3b8', claims: claims.filter(c => c.status === 'draft')     },
    { status: 'submitted', label: 'Submitted', color: '#8b5cf6', claims: claims.filter(c => c.status === 'submitted') },
    { status: 'paid',      label: 'Paid',      color: '#059669', claims: claims.filter(c => c.status === 'paid')      },
    { status: 'refused',   label: 'Refused',   color: '#e11d48', claims: claims.filter(c => c.status === 'refused')   },
  ];

  return (
    <div>
      {/* Claims hero */}
      <div className="claims-hero" style={{ marginBottom: 22 }}>
        <div className="ch-inner">
          <div className="ch-l">
            <div className="ch-eyebrow">Provincial Health Billing</div>
            <div className="ch-title">Claims Queue</div>
            <div className="ch-sub">Manage, submit, and track all provincial insurance claims across BC, AB, ON, and more.</div>
          </div>
          <div className="ch-stats">
            <div>
              <div className="ch-stat-lbl">Total</div>
              <div className="ch-stat-val">{stats.total}</div>
            </div>
            <div>
              <div className="ch-stat-lbl">MTD Revenue</div>
              <div className="ch-stat-val">{fmt$(stats.mtdRevenue)}</div>
            </div>
            {stats.refused > 0 && (
              <div>
                <div className="ch-stat-lbl" style={{ color: '#fca5a5' }}>Refused</div>
                <div className="ch-stat-val" style={{ color: '#fca5a5' }}>{stats.refused}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/claims/new" className="btn btn-on-hero btn-sm">
              <Plus size={13}/> New Claim
            </Link>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tbar" style={{ marginBottom: 14 }}>
        <div className="tbar-l">
          {/* Status filter pills */}
          <div className="fpills">
            {FILTERS.map(f => {
              const count = f.key === 'all' ? stats.total
                : f.key === 'draft'     ? stats.draft
                : f.key === 'submitted' ? stats.submitted
                : f.key === 'paid'      ? stats.paid
                : f.key === 'refused'   ? stats.refused : 0;
              return (
                <button
                  key={f.key}
                  className={`fpill${statusFilter === f.key ? ' active' : ''}`}
                  onClick={() => handleFilterChange(f.key)}
                >
                  <span className="fpill-dot" style={{ background: f.dot }}/>
                  {f.label}
                  <span className="fpill-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="sr" style={{ minWidth: 200 }}>
            <span className="sr-ico"><Search size={13}/></span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Name, PHN, dx code…"
            />
          </div>
        </div>

        <div className="tbar-r">
          {/* View toggle */}
          <div className="vt">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              <List size={13}/> Table
            </button>
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>
              <LayoutGrid size={13}/> Board
            </button>
          </div>

          {/* Batch submit */}
          {draftClaims.length > 0 && (
            <button
              className="btn btn-p btn-sm"
              onClick={handleBatchSubmit}
              disabled={batchLoading}
            >
              <Send size={13}/>
              {batchLoading
                ? 'Submitting…'
                : selected.size > 0
                  ? `Submit ${selected.size}`
                  : `Submit ${draftClaims.length} Draft${draftClaims.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {batchError && (
        <div className="alrt al-err" style={{ marginBottom: 12 }}>
          <AlertTriangle size={14} className="alrt-ico"/> {batchError}
        </div>
      )}

      {/* Refused alert */}
      {stats.refused > 0 && statusFilter === 'all' && (
        <div className="alrt al-err" style={{ marginBottom: 14 }}>
          <AlertCircle size={14} className="alrt-ico"/>
          <span>
            <strong>{stats.refused} claim{stats.refused !== 1 ? 's' : ''} refused</strong> — review the refusal codes and resubmit.{' '}
            <button className="btn btn-sm btn-d" style={{ padding: '3px 10px' }} onClick={() => handleFilterChange('refused')}>
              View refused
            </button>
          </span>
        </div>
      )}

      {claims.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-ico"><FileText size={22} style={{ color: 'var(--t4)' }}/></div>
            <div style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
              {q ? `No claims matching "${q}"` : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}claims`}
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--t3)', marginBottom: 14 }}>
              {statusFilter === 'all' && !q ? 'Submit your first claim to get started.' : 'Try a different filter or search term.'}
            </div>
            {statusFilter === 'all' && !q && (
              <Link href="/claims/new" className="btn btn-p btn-sm"><Plus size={13}/> New Claim</Link>
            )}
          </div>
        </div>
      ) : view === 'table' ? (
        /* ── Table view ──────────────────────────────────────────────────── */
        <div className="card">
          <div className="tw">
            <table>
              <thead>
                <tr>
                  {draftClaims.length > 0 && (
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        className="bp-check"
                        checked={selected.size === draftClaims.length && draftClaims.length > 0}
                        onChange={toggleAll}
                        aria-label="Select all drafts"
                      />
                    </th>
                  )}
                  <th>Patient</th>
                  <th>Province / System</th>
                  <th>Fee Code</th>
                  <th>Dx</th>
                  <th>Svc Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                  <th style={{ width: 60 }}/>
                </tr>
              </thead>
              <tbody>
                {claims.map(claim => {
                  const cfg = STATUS_CFG[claim.status] ?? STATUS_CFG.draft;
                  const provColor = PROV_COLOR[claim.province] ?? 'var(--sky)';
                  const feeCode = (claim.fee_codes as { code: string }[])[0]?.code ?? '—';
                  const isDraft = claim.status === 'draft';
                  const isSelected = selected.has(claim.id);

                  return (
                    <React.Fragment key={claim.id}>
                      <tr style={{ background: isSelected ? 'var(--sky-lt)' : undefined }}>
                        {draftClaims.length > 0 && (
                          <td>
                            {isDraft && (
                              <input
                                type="checkbox"
                                className="bp-check"
                                checked={isSelected}
                                onChange={() => toggleSelect(claim.id)}
                                aria-label={`Select ${claim.patient_name}`}
                              />
                            )}
                          </td>
                        )}
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--t1)' }}>
                            {claim.patient_name || <span style={{ color: 'var(--t4)', fontStyle: 'italic' }}>Unnamed</span>}
                          </div>
                          <div style={{ fontFamily: 'var(--fm)', fontSize: '.72rem', color: 'var(--t4)', marginTop: 2, letterSpacing: '.05em' }}>
                            {claim.health_card_no}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: '.72rem', padding: '2px 8px', borderRadius: 20, background: provColor + '14', color: provColor, alignSelf: 'flex-start' }}>
                              {claim.province}
                            </span>
                            <span style={{ fontSize: '.7rem', color: 'var(--t4)' }}>{PROV_SYSTEM[claim.province] ?? claim.province}</span>
                          </div>
                        </td>
                        <td><span className="code-chip">{feeCode}</span></td>
                        <td>
                          {claim.diagnosis_code
                            ? <span className="icd-chip">{claim.diagnosis_code}</span>
                            : <span style={{ color: 'var(--t4)', fontSize: '.78rem' }}>—</span>}
                        </td>
                        <td style={{ fontSize: '.82rem', color: 'var(--t2)' }}>
                          {fmtDate(claim.service_date)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--fm)', fontWeight: 600, fontSize: '.9rem' }}>
                          {fmt$(claim.subtotal)}
                          {claim.paid_amount && claim.paid_amount !== claim.subtotal && (
                            <div style={{ fontSize: '.7rem', color: 'var(--t4)', textDecoration: 'line-through' }}>
                              {fmt$(claim.paid_amount)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={cfg.cls}>{cfg.label}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {claim.status === 'refused' && (
                              <button
                                className="btn btn-sm btn-d"
                                style={{ padding: '4px 8px', fontSize: '.7rem' }}
                                title="Mark as draft and resubmit"
                                onClick={async () => {
                                  const { updateClaimStatus } = await import('@/lib/actions/claims');
                                  await updateClaimStatus(claim.id, 'draft');
                                  router.refresh();
                                }}
                              >
                                <RotateCcw size={11}/>
                              </button>
                            )}
                            {isDraft && (
                              <button
                                className="btn btn-sm"
                                style={{ padding: '4px 8px', fontSize: '.7rem', color: '#b91c1c', background: 'transparent', border: 'none' }}
                                title="Delete draft"
                                onClick={() => handleDelete(claim.id)}
                              >
                                <Trash2 size={11}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Inline refusal reason */}
                      {claim.rejection_reason && (
                        <tr>
                          <td colSpan={draftClaims.length > 0 ? 9 : 8} style={{ paddingTop: 0, paddingBottom: 10 }}>
                            <div style={{
                              display: 'flex', alignItems: 'flex-start', gap: 8,
                              background: '#fff1f3', border: '1px solid #fecdd3',
                              borderRadius: 8, padding: '7px 11px', fontSize: '.78rem', color: '#b91c1c',
                            }}>
                              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }}/>
                              <span>
                                {claim.rejection_code && <strong>{claim.rejection_code}: </strong>}
                                {claim.rejection_reason}
                              </span>
                              <button
                                className="btn btn-sm"
                                style={{ marginLeft: 'auto', padding: '2px 10px', fontSize: '.7rem', background: '#fecdd3', color: '#b91c1c', border: 'none', flexShrink: 0 }}
                                onClick={async () => {
                                  const { updateClaimStatus } = await import('@/lib/actions/claims');
                                  await updateClaimStatus(claim.id, 'draft');
                                  router.refresh();
                                }}
                              >
                                <RotateCcw size={11}/> Resubmit
                              </button>
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

          {/* Table footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderTop: '1px solid var(--bd)',
            fontSize: '.8rem', color: 'var(--t3)',
          }}>
            <span>
              {claims.length} claim{claims.length !== 1 ? 's' : ''}
              {' · '}
              {fmt$(claims.reduce((s, c) => s + c.subtotal, 0))} total
            </span>
            <button className="btn btn-g btn-sm btn-xs">
              <Download size={12}/> Export CSV
            </button>
          </div>
        </div>
      ) : (
        /* ── Kanban view ─────────────────────────────────────────────────── */
        <div className="kb">
          {kanbanCols.map(col => (
            <div className="kcol" key={col.status}>
              <div className="kcol-h">
                <div className="kcol-t">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }}/>
                  {col.label}
                  <span className="fpill-count" style={{ marginLeft: 2 }}>{col.claims.length}</span>
                </div>
                <span className="kcol-tot">
                  {fmt$(col.claims.reduce((s, c) => s + c.subtotal, 0))}
                </span>
              </div>
              <div className="kcol-body">
                {col.claims.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t4)', fontSize: '.78rem' }}>
                    No {col.label.toLowerCase()} claims
                  </div>
                ) : col.claims.map(claim => (
                  <KanbanCard
                    key={claim.id}
                    claim={claim}
                    selected={selected.has(claim.id)}
                    onSelect={id => claim.status === 'draft' ? toggleSelect(id) : undefined}
                  />
                ))}
                {col.status === 'draft' && (
                  <Link
                    href="/claims/new"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 10,
                      border: '1.5px dashed var(--bd2)',
                      fontSize: '.78rem', color: 'var(--t4)',
                      cursor: 'pointer', textDecoration: 'none',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={13}/> New Claim
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

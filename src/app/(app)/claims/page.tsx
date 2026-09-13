'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search, Plus, AlertCircle, CheckCircle2, Clock, FileText,
  ChevronDown, Send, LayoutList, Kanban, X,
} from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────────────────────────
const CLAIMS = [
  { id: 'CLM-1042', patient: 'James Burnham',     initials: 'JB', phn: '9151210417', code: '00110', dx: 'H52.1', amount: 88.35,  status: 'paid',      date: 'Aug 5, 2026', refusal: null },
  { id: 'CLM-1041', patient: 'Christine Burrows',  initials: 'CB', phn: '9151065434', code: '00115', dx: 'H40.0', amount: 107.20, status: 'paid',      date: 'Aug 5, 2026', refusal: null },
  { id: 'CLM-1040', patient: 'Austin Mercer',      initials: 'AM', phn: '9151242549', code: '00110', dx: 'H52.4', amount: 88.35,  status: 'refused',   date: 'Aug 4, 2026', refusal: 'C12-21: Invalid diagnosis code for service rendered.' },
  { id: 'CLM-1039', patient: 'Linda Thorpe',       initials: 'LT', phn: '9151071072', code: '00111', dx: 'H52.1', amount: 54.00,  status: 'submitted', date: 'Aug 4, 2026', refusal: null },
  { id: 'CLM-1038', patient: 'Robert Chan',        initials: 'RC', phn: '9151274799', code: '00110', dx: 'H40.1', amount: 88.35,  status: 'paid',      date: 'Aug 3, 2026', refusal: null },
  { id: 'CLM-1037', patient: 'Sarah Nikolaev',     initials: 'SN', phn: '9151206012', code: '00113', dx: 'H52.1', amount: 73.55,  status: 'draft',     date: 'Aug 3, 2026', refusal: null },
  { id: 'CLM-1036', patient: 'Michael Torres',     initials: 'MT', phn: '9151259051', code: '00110', dx: 'H52.1', amount: 88.35,  status: 'draft',     date: 'Aug 3, 2026', refusal: null },
  { id: 'CLM-1035', patient: 'Priya Sharma',       initials: 'PS', phn: '9151188234', code: '00110', dx: 'H53.2', amount: 88.35,  status: 'submitted', date: 'Aug 2, 2026', refusal: null },
];

const FILTERS = [
  { key: 'all',       label: 'All',       color: '#64748b' },
  { key: 'draft',     label: 'Draft',     color: '#94a3b8' },
  { key: 'submitted', label: 'Submitted', color: '#2563eb' },
  { key: 'paid',      label: 'Paid',      color: '#059669' },
  { key: 'refused',   label: 'Refused',   color: '#e11d48' },
] as const;
type FilterKey = typeof FILTERS[number]['key'];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  paid:      { label: 'Paid',      cls: 'badge b-paid' },
  submitted: { label: 'Submitted', cls: 'badge b-submitted' },
  refused:   { label: 'Refused',   cls: 'badge b-rejected' },
  draft:     { label: 'Draft',     cls: 'badge b-draft' },
};

const AV_COLOR = ['av-1','av-2','av-3','av-4','av-5'];

const KANBAN_COLS = [
  { key: 'draft',     label: 'Draft',     color: '#94a3b8', bg: '#f8fafc' },
  { key: 'submitted', label: 'Submitted', color: '#2563eb', bg: '#eff5ff' },
  { key: 'paid',      label: 'Paid',      color: '#059669', bg: '#ecfdf5' },
  { key: 'refused',   label: 'Refused',   color: '#e11d48', bg: '#fff1f3' },
];

export default function ClaimsPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'board'>('list');

  const filtered = CLAIMS.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.patient.toLowerCase().includes(q) || c.phn.includes(q) || c.id.toLowerCase().includes(q);
    }
    return true;
  });

  const drafts = CLAIMS.filter(c => c.status === 'draft');
  const countFor = (k: string) => k === 'all' ? CLAIMS.length : CLAIMS.filter(c => c.status === k).length;

  return (
    <>
      {/* Claims hero */}
      <div className="claims-hero">
        <div className="ch-inner">
          <div className="ch-l">
            <div className="ch-eyebrow">MSP · OHIP · AHCIP · All provinces</div>
            <div className="ch-title">Claims Queue</div>
            <div className="ch-sub">Submit, track, and reconcile all your provincial health claims in one place.</div>
          </div>
          <div className="ch-stats">
            <div>
              <div className="ch-stat-lbl">MTD Submitted</div>
              <div className="ch-stat-val">$18,420</div>
            </div>
            <div>
              <div className="ch-stat-lbl">Pending</div>
              <div className="ch-stat-val">14</div>
            </div>
            <div>
              <div className="ch-stat-lbl">Refused</div>
              <div className="ch-stat-val">3</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {drafts.length > 0 && (
              <button className="btn btn-on-hero">
                <Send size={14} /> Submit {drafts.length} Draft{drafts.length > 1 ? 's' : ''}
              </button>
            )}
            <Link href="/claims/new" className="btn btn-on-hero">
              <Plus size={14} /> New Claim
            </Link>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tbar">
        <div className="tbar-l">
          {/* Filter pills */}
          <div className="fpills">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`fpill${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                <span className="fpill-dot" style={{ background: f.color }} />
                {f.label}
                <span className="fpill-count">{countFor(f.key)}</span>
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="sr" style={{ minWidth: 220 }}>
            <span className="sr-ico"><Search size={14}/></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patient, PHN, ID…"
            />
          </div>
        </div>
        <div className="tbar-r">
          {/* View toggle */}
          <div className="vt">
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
              <LayoutList size={14} /> List
            </button>
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>
              <Kanban size={14} /> Board
            </button>
          </div>
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Claim ID</th>
                  <th>Code · Dx</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--t4)' }}>No claims match this filter.</td></tr>
                )}
                {filtered.map((c, i) => {
                  const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
                  const isOpen = expanded === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : c.id)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span className={`av ${AV_COLOR[i % AV_COLOR.length]}`}>{c.initials}</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{c.patient}</div>
                              <div style={{ fontSize: '.72rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{c.phn}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="mono" style={{ color: 'var(--sky-dk)' }}>{c.id}</span></td>
                        <td>
                          <span className="code-chip" style={{ marginRight: 4 }}>{c.code}</span>
                          <span className="icd-chip">{c.dx}</span>
                        </td>
                        <td><span className={st.cls}>{st.label}</span></td>
                        <td style={{ color: 'var(--t3)', fontSize: '.82rem' }}>{c.date}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${c.amount.toFixed(2)}</td>
                        <td style={{ width: 28 }}>
                          <ChevronDown size={14} style={{ color: 'var(--t4)', transition: 'transform .15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={7} style={{ background: 'var(--n50)', padding: '14px 20px' }}>
                            {c.refusal && (
                              <div className="alrt al-err" style={{ marginBottom: 12 }}>
                                <AlertCircle size={15} className="alrt-ico" />
                                <span><strong>Refusal reason:</strong> {c.refusal}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {c.status === 'draft' && (
                                <button className="btn btn-p btn-sm"><Send size={13} /> Submit Claim</button>
                              )}
                              {c.status === 'refused' && (
                                <button className="btn btn-p btn-sm">Fix &amp; Resubmit</button>
                              )}
                              <button className="btn btn-s btn-sm">Edit</button>
                              <button className="btn btn-d btn-sm"><X size={12} /> Delete</button>
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

      {/* Board / Kanban view */}
      {view === 'board' && (
        <div className="kb">
          {KANBAN_COLS.map((col) => {
            const cards = CLAIMS.filter(c => c.status === col.key);
            const total = cards.reduce((s, c) => s + c.amount, 0);
            return (
              <div key={col.key} className="kcol">
                <div className="kcol-h">
                  <div className="kcol-t">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                    {col.label}
                  </div>
                  <span className="kcol-tot">{cards.length} · ${total.toFixed(0)}</span>
                </div>
                <div className="kcol-body">
                  {cards.map((c, i) => (
                    <div key={c.id} className="kcard">
                      <div className="kcard-h">
                        <span className="kcard-id">{c.id}</span>
                        <span className="kcard-amt">${c.amount.toFixed(2)}</span>
                      </div>
                      <div className="kcard-p">
                        <span className={`av ${AV_COLOR[i % AV_COLOR.length]}`} style={{ width: 26, height: 26, fontSize: '.65rem' }}>{c.initials}</span>
                        <div>
                          <div className="kcard-pn">{c.patient}</div>
                          <div className="kcard-pm">{c.phn}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                        <span className="code-chip">{c.code}</span>
                        <span className="icd-chip">{c.dx}</span>
                      </div>
                      {c.refusal && (
                        <div style={{ fontSize: '.72rem', color: 'var(--bad)', background: 'var(--bad-lt)', border: '1px solid var(--bad-b)', borderRadius: 7, padding: '5px 8px', marginBottom: 8, lineHeight: 1.4 }}>
                          <AlertCircle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                          {c.refusal.slice(0, 48)}…
                        </div>
                      )}
                      <div className="kcard-meta">
                        <span>{c.date}</span>
                        {c.status === 'draft' && (
                          <button className="btn btn-p btn-xs"><Send size={11} /> Submit</button>
                        )}
                        {c.status === 'refused' && (
                          <button className="btn btn-d btn-xs">Fix</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="empty" style={{ padding: '24px 12px' }}>
                      <div style={{ fontSize: '.78rem', color: 'var(--t4)' }}>No {col.label.toLowerCase()} claims</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

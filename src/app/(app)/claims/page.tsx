'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Plus, AlertCircle, CheckCircle2, Clock, FileText,
  ChevronDown, Send, Layers, X, RefreshCw, Globe, Zap,
  ChevronRight, AlertTriangle, RotateCcw, Download,
} from 'lucide-react';

// ── Province billing systems ──────────────────────────────────────────────────
const PROVINCE_SYSTEMS: Record<string, { name: string; portal: string; color: string }> = {
  BC: { name: 'Teleplan / MSP',        portal: 'teleplan.bc.gov.bc.ca',   color: '#059669' },
  ON: { name: 'OHIP / eClaims',        portal: 'claimsecure.com/ohip',    color: '#2563eb' },
  AB: { name: 'AHCIP / Netcare',       portal: 'albertanetcare.ca',        color: '#7c3aed' },
  MB: { name: 'MHSAL',                 portal: 'gov.mb.ca/health/mhsal',  color: '#0891b2' },
  SK: { name: 'SK Health Authority',   portal: 'ehealthsk.ca',             color: '#d97706' },
  QC: { name: 'RAMQ',                  portal: 'ramq.gouv.qc.ca',          color: '#dc2626' },
  NS: { name: 'MSI / Medavie',         portal: 'medavie.bluecross.ca/msi', color: '#0284c7' },
  NB: { name: 'Medicare NB',           portal: 'gnb.ca/medicare',          color: '#65a30d' },
  NL: { name: 'MCP',                   portal: 'gov.nl.ca/mcp',            color: '#7c3aed' },
  PE: { name: 'PEI Health',            portal: 'princeedwardisland.ca',    color: '#ea580c' },
};

// ── All billable professions ──────────────────────────────────────────────────
const PROFESSIONS = [
  'Physician (MD/DO)', 'Optometrist (OD)', 'Dentist (DDS/DMD)',
  'Oral Surgeon', 'Nurse Practitioner (NP)', 'Registered Nurse — Extended',
  'Midwife (RM)', 'Chiropractor (DC)', 'Physiotherapist (PT)',
  'Occupational Therapist (OT)', 'Speech-Language Pathologist (SLP)',
  'Psychologist (RPsych)', 'Naturopathic Doctor (ND)', 'Podiatrist / Chiropodist',
  'Audiologist', 'Dietitian (RD)', 'Pharmacist (RPh)', 'Optician (RO)',
];

// ── Mock claims ───────────────────────────────────────────────────────────────
const CLAIMS_DATA = [
  { id: 'CLM-1042', patient: 'James Burnham',     initials: 'JB', phn: '9151210417', province: 'BC', profession: 'Optometrist (OD)', code: '00110', dx: 'H52.1', amount: 88.35,  status: 'paid',      date: 'Sep 13, 2026', refusal: null },
  { id: 'CLM-1041', patient: 'Christine Burrows', initials: 'CB', phn: '9151065434', province: 'BC', profession: 'Optometrist (OD)', code: '00115', dx: 'H40.0', amount: 107.20, status: 'paid',      date: 'Sep 13, 2026', refusal: null },
  { id: 'CLM-1040', patient: 'Austin Mercer',     initials: 'AM', phn: '9151242549', province: 'BC', profession: 'Optometrist (OD)', code: '00110', dx: 'H52.4', amount: 88.35,  status: 'refused',   date: 'Sep 12, 2026', refusal: 'C12-21: Invalid diagnosis code for service rendered.' },
  { id: 'CLM-1039', patient: 'Linda Thorpe',      initials: 'LT', phn: '9151071072', province: 'BC', profession: 'Optometrist (OD)', code: '00111', dx: 'H52.1', amount: 54.00,  status: 'submitted', date: 'Sep 12, 2026', refusal: null },
  { id: 'CLM-1038', patient: 'Robert Chan',       initials: 'RC', phn: '9151274799', province: 'ON', profession: 'Physician (MD/DO)', code: 'A001A', dx: 'H40.1', amount: 38.05,  status: 'paid',      date: 'Sep 11, 2026', refusal: null },
  { id: 'CLM-1037', patient: 'Sarah Nikolaev',    initials: 'SN', phn: '9151206012', province: 'BC', profession: 'Optometrist (OD)', code: '00113', dx: 'H52.1', amount: 73.55,  status: 'draft',     date: 'Sep 11, 2026', refusal: null },
  { id: 'CLM-1036', patient: 'Michael Torres',    initials: 'MT', phn: '9151259051', province: 'AB', profession: 'Chiropractor (DC)', code: '03.01A', dx: 'M54.5', amount: 39.65, status: 'draft',     date: 'Sep 10, 2026', refusal: null },
  { id: 'CLM-1035', patient: 'Priya Sharma',      initials: 'PS', phn: '9151188234', province: 'BC', profession: 'Optometrist (OD)', code: '00110', dx: 'H53.2', amount: 88.35,  status: 'submitted', date: 'Sep 10, 2026', refusal: null },
  { id: 'CLM-1034', patient: 'Ying-Ying Wu',      initials: 'YW', phn: '9151300019', province: 'ON', profession: 'Nurse Practitioner (NP)', code: 'K013', dx: 'J06.9', amount: 30.15, status: 'paid', date: 'Sep 9, 2026',  refusal: null },
  { id: 'CLM-1033', patient: 'Marcus Reid',       initials: 'MR', phn: '9151401122', province: 'BC', profession: 'Midwife (RM)',    code: '16950', dx: 'Z34.1', amount: 120.00, status: 'refused',   date: 'Sep 8, 2026',  refusal: 'E01: Service not covered under current registration' },
];

const FILTERS = [
  { key: 'all',       label: 'All'       },
  { key: 'draft',     label: 'Draft'     },
  { key: 'submitted', label: 'Submitted' },
  { key: 'paid',      label: 'Paid'      },
  { key: 'refused',   label: 'Refused'   },
] as const;
type FilterKey = typeof FILTERS[number]['key'];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  paid:      { label: 'Paid',      cls: 'badge b-paid' },
  submitted: { label: 'Submitted', cls: 'badge b-submitted' },
  refused:   { label: 'Refused',   cls: 'badge b-rejected' },
  draft:     { label: 'Draft',     cls: 'badge b-draft' },
};

const AV_COLOR = ['av-1', 'av-2', 'av-3', 'av-4', 'av-5'];

// ── Batch log ─────────────────────────────────────────────────────────────────
interface BatchEntry {
  id: string; timestamp: string; province: string;
  claimCount: number; totalAmount: number;
  status: 'success' | 'partial' | 'error';
  message: string;
}
const BATCH_LOG: BatchEntry[] = [
  { id: 'B-20260913-001', timestamp: 'Sep 13 08:14', province: 'BC', claimCount: 28, totalAmount: 2347.40, status: 'success', message: 'All 28 claims accepted by Teleplan MSP' },
  { id: 'B-20260912-001', timestamp: 'Sep 12 08:31', province: 'BC', claimCount: 22, totalAmount: 1918.60, status: 'partial', message: '21 accepted, 1 refused — C12 code mismatch' },
  { id: 'B-20260911-001', timestamp: 'Sep 11 09:05', province: 'ON', claimCount: 6,  totalAmount: 312.20,  status: 'success', message: 'OHIP batch accepted — payment ETA 21 days' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function ClaimsPage() {
  const [filter, setFilter]       = useState<FilterKey>('all');
  const [search, setSearch]       = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'batch'>('queue');
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [batchDone, setBatchDone] = useState(false);

  const filtered = useMemo(() => CLAIMS_DATA.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (provinceFilter !== 'all' && c.province !== provinceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.patient.toLowerCase().includes(q) || c.phn.includes(q) || c.id.toLowerCase().includes(q) || c.profession.toLowerCase().includes(q);
    }
    return true;
  }), [filter, search, provinceFilter]);

  const drafts = CLAIMS_DATA.filter((c) => c.status === 'draft');
  const selectedDrafts = [...selected].filter((id) => drafts.find((d) => d.id === id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllDrafts() {
    setSelected(new Set(drafts.map((d) => d.id)));
  }

  function submitBatch() {
    if (selected.size === 0) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setBatchDone(true); setSelected(new Set()); setTimeout(() => setBatchDone(false), 3000); }, 1800);
  }

  function countFor(k: string) {
    return k === 'all' ? CLAIMS_DATA.length : CLAIMS_DATA.filter((c) => c.status === k).length;
  }

  const batchTotal = [...selected]
    .map((id) => CLAIMS_DATA.find((c) => c.id === id)?.amount ?? 0)
    .reduce((s, a) => s + a, 0);

  return (
    <>
      {/* ── Claims hero ───────────────────────────────────────────────────── */}
      <div className="claims-hero">
        <div className="ch-inner">
          <div className="ch-l">
            <div className="ch-eyebrow">
              All Provinces · All Regulated Health Professions
            </div>
            <div className="ch-title">Claims Engine</div>
            <div className="ch-sub">
              Submit, scrub, track and reconcile provincial health claims across every Canadian billing plan — MSP, OHIP, AHCIP, RAMQ, MCP and more.
            </div>
          </div>
          <div className="ch-stats">
            <div>
              <div className="ch-stat-lbl">MTD Submitted</div>
              <div className="ch-stat-val">$18,420</div>
            </div>
            <div>
              <div className="ch-stat-lbl">Pending</div>
              <div className="ch-stat-val">{countFor('submitted') + countFor('draft')}</div>
            </div>
            <div>
              <div className="ch-stat-lbl">Refused</div>
              <div className="ch-stat-val">{countFor('refused')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {drafts.length > 0 && (
              <button className="btn btn-on-hero" onClick={() => { selectAllDrafts(); setActiveTab('batch'); }}>
                <Zap size={14} /> Batch Submit ({drafts.length})
              </button>
            )}
            <Link href="/claims/new" className="btn btn-on-hero">
              <Plus size={14} /> New Claim
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--bd)', paddingBottom: 0 }}>
        {[
          { id: 'queue', label: 'Claims Queue', icon: FileText },
          { id: 'batch', label: 'Batch Protocol', icon: Layers, badge: selected.size > 0 ? selected.size : null },
        ].map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', fontSize: '.85rem', fontWeight: 600,
              borderBottom: activeTab === id ? '2px solid var(--lilac)' : '2px solid transparent',
              color: activeTab === id ? 'var(--lilac)' : 'var(--t3)',
              background: 'none', border: 'none', borderRadius: '10px 10px 0 0',
              cursor: 'pointer', transition: 'color .15s',
              fontFamily: 'var(--ff)',
              marginBottom: -1,
            }}
          >
            <Icon size={14} /> {label}
            {badge != null && (
              <span style={{
                background: 'var(--lilac)', color: '#fff', borderRadius: 20,
                fontSize: '.65rem', fontWeight: 700, padding: '1px 7px',
              }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Claims Queue tab ──────────────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <>
          {/* Filters row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="tb-search" style={{ flex: 1, minWidth: 220 }}>
              <Search size={14} style={{ color: 'var(--t4)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, PHN, claim ID, profession…"
              />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--t4)' }}><X size={13} /></button>}
            </div>

            {/* Province filter */}
            <div style={{ position: 'relative' }}>
              <Globe size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)', pointerEvents: 'none' }} />
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="sr"
                style={{ paddingLeft: 28, fontSize: '.82rem' }}
              >
                <option value="all">All Provinces</option>
                {Object.entries(PROVINCE_SYSTEMS).map(([code]) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>

            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: 5 }}>
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`fpill${filter === key ? ' active' : ''}`}
                >
                  {label}
                  <span className="fpill-count">{countFor(key)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        onChange={(e) => e.target.checked ? setSelected(new Set(filtered.map(c => c.id))) : setSelected(new Set())}
                        checked={selected.size === filtered.length && filtered.length > 0}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th>Patient</th>
                    <th>Province / Plan</th>
                    <th>Profession</th>
                    <th>Code</th>
                    <th>Dx</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--t4)', fontSize: '.85rem' }}>No claims match your filters.</td></tr>
                  )}
                  {filtered.map((c, i) => {
                    const sys = PROVINCE_SYSTEMS[c.province];
                    const isExp = expanded === c.id;
                    return (
                      <React.Fragment key={c.id}>
                        <tr style={{ background: selected.has(c.id) ? 'rgba(139,92,246,.04)' : undefined }}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.has(c.id)}
                              onChange={() => toggleSelect(c.id)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <span className={`av ${AV_COLOR[i % AV_COLOR.length]}`}>{c.initials}</span>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{c.patient}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{c.phn} · {c.date}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{
                                fontSize: '.7rem', fontWeight: 700, color: sys?.color ?? 'var(--lilac)',
                                background: `${sys?.color ?? '#7c3aed'}14`,
                                borderRadius: 6, padding: '2px 7px', display: 'inline-block',
                              }}>{c.province}</span>
                              <span style={{ fontSize: '.69rem', color: 'var(--t4)' }}>{sys?.name}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '.78rem', color: 'var(--t2)' }}>{c.profession}</td>
                          <td><span className="code-chip">{c.code}</span></td>
                          <td><span className="icd-chip">{c.dx}</span></td>
                          <td><span className={STATUS_CONFIG[c.status]?.cls ?? 'badge b-draft'}>{STATUS_CONFIG[c.status]?.label ?? c.status}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t1)' }}>
                            ${c.amount.toFixed(2)}
                          </td>
                          <td>
                            <button
                              onClick={() => setExpanded(isExp ? null : c.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6 }}
                            >
                              {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                        </tr>
                        {isExp && (
                          <tr>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div style={{
                                padding: '14px 20px', background: 'rgba(139,92,246,.03)',
                                borderTop: '1px solid var(--bd)', display: 'flex', gap: 20, flexWrap: 'wrap',
                              }}>
                                {c.refusal && (
                                  <div style={{
                                    flex: 1, minWidth: 240, padding: '10px 14px',
                                    background: 'var(--bad-lt)', borderRadius: 10, border: '1px solid var(--bad-b)',
                                    display: 'flex', gap: 8, alignItems: 'flex-start',
                                  }}>
                                    <AlertTriangle size={14} style={{ color: 'var(--bad)', flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                      <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--bad)', marginBottom: 2 }}>Refusal Reason</div>
                                      <div style={{ fontSize: '.8rem', color: '#7f1d1d' }}>{c.refusal}</div>
                                    </div>
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '.75rem', color: 'var(--t3)', fontWeight: 600 }}>Billing via {sys?.name} · {sys?.portal}</span>
                                  {c.status === 'refused' && (
                                    <button className="btn btn-s btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.75rem' }}>
                                      <RotateCcw size={12} /> Resubmit
                                    </button>
                                  )}
                                  {c.status === 'draft' && (
                                    <button className="btn btn-p btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.75rem' }}>
                                      <Send size={12} /> Submit Now
                                    </button>
                                  )}
                                  <Link
                                    href={`/claims/${c.id}`}
                                    className="btn btn-g btn-sm"
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.75rem' }}
                                  >
                                    <FileText size={12} /> View Claim
                                  </Link>
                                </div>
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

          {/* Batch action bar */}
          {selected.size > 0 && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--t1)', borderRadius: 16, padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 8px 32px rgba(15,23,42,.28)', zIndex: 200,
              color: '#fff', minWidth: 360,
            }}>
              <span style={{ fontSize: '.85rem', fontWeight: 600 }}>
                {selected.size} claim{selected.size > 1 ? 's' : ''} selected
                <span style={{ color: '#a5b4fc', marginLeft: 8 }}>${batchTotal.toFixed(2)}</span>
              </span>
              <button
                onClick={submitBatch}
                disabled={submitting}
                style={{
                  marginLeft: 'auto', background: 'var(--lilac)', color: '#fff',
                  border: 'none', borderRadius: 10, padding: '7px 16px',
                  fontSize: '.82rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: submitting ? .7 : 1, fontFamily: 'var(--ff)',
                }}
              >
                {submitting ? <><RefreshCw size={13} className="animate-spin" /> Submitting…</> : <><Send size={13} /> Submit to Billing System</>}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              ><X size={16} /></button>
            </div>
          )}

          {batchDone && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: '#059669', color: '#fff', borderRadius: 14, padding: '12px 22px',
              display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: '.85rem',
              boxShadow: '0 8px 24px rgba(5,150,105,.3)', zIndex: 200,
            }}>
              <CheckCircle2 size={16} /> Batch submitted successfully!
            </div>
          )}
        </>
      )}

      {/* ── Batch Protocol tab ────────────────────────────────────────────── */}
      {activeTab === 'batch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Protocol status panel */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14,
          }}>
            {[
              { label: 'Drafts Ready', value: String(drafts.length),   color: 'var(--lilac)', bg: 'rgba(139,92,246,.1)' },
              { label: 'Selected',     value: String(selected.size),   color: '#d97706',       bg: '#fffbeb' },
              { label: 'Batch Total',  value: `$${batchTotal.toFixed(2)}`, color: '#059669', bg: '#ecfdf5' },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 0 4px ${s.bg}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: '1.35rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Province routing */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--t1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Globe size={15} style={{ color: 'var(--lilac)' }} /> Batch Routing by Province
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(PROVINCE_SYSTEMS).map(([code, sys]) => {
                const provinceDrafts = drafts.filter((d) => d.province === code);
                if (provinceDrafts.length === 0) return null;
                const isSelected = provinceDrafts.some((d) => selected.has(d.id));
                return (
                  <div
                    key={code}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
                      background: isSelected ? `${sys.color}0a` : 'var(--bg2)',
                      border: `1px solid ${isSelected ? sys.color + '40' : 'var(--bd)'}`,
                      borderRadius: 12,
                    }}
                  >
                    <span style={{
                      fontWeight: 800, fontSize: '.75rem', color: sys.color,
                      background: `${sys.color}18`, borderRadius: 6, padding: '3px 8px',
                      minWidth: 36, textAlign: 'center',
                    }}>{code}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.83rem', fontWeight: 600, color: 'var(--t1)' }}>{sys.name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{sys.portal}</div>
                    </div>
                    <span style={{ fontSize: '.78rem', color: 'var(--t3)', fontWeight: 600 }}>
                      {provinceDrafts.length} draft{provinceDrafts.length > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => setSelected((prev) => {
                        const next = new Set(prev);
                        provinceDrafts.forEach((d) => next.add(d.id));
                        return next;
                      })}
                      className="btn btn-s btn-sm"
                      style={{ fontSize: '.72rem' }}
                    >
                      Select All
                    </button>
                  </div>
                );
              })}
              {drafts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '28px', color: 'var(--t4)', fontSize: '.85rem' }}>
                  No draft claims pending batch submission.
                </div>
              )}
            </div>
          </div>

          {/* Pre-submission scrub checklist */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--t1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <CheckCircle2 size={15} style={{ color: 'var(--lilac)' }} /> Pre-Submission Claim Scrub
            </div>
            {[
              { ok: true,  label: 'PHN format validated for each province' },
              { ok: true,  label: 'Fee code / service code active in current fee schedule' },
              { ok: true,  label: 'ICD-10 diagnosis code matched to service' },
              { ok: false, label: 'Provider registration active for CLM-1040 (BC)' },
              { ok: true,  label: 'Service date within billing window (≤ 90 days)' },
              { ok: true,  label: 'Duplicate claim check passed' },
              { ok: true,  label: 'Profession-plan coverage verified' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: i < 6 ? '1px solid var(--bd)' : 'none',
              }}>
                {item.ok
                  ? <CheckCircle2 size={15} style={{ color: '#059669', flexShrink: 0 }} />
                  : <AlertCircle size={15} style={{ color: '#e11d48', flexShrink: 0 }} />
                }
                <span style={{ fontSize: '.83rem', color: item.ok ? 'var(--t2)' : '#7f1d1d', fontWeight: item.ok ? 400 : 600 }}>
                  {item.label}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                onClick={submitBatch}
                disabled={submitting || selected.size === 0}
                className="btn btn-p"
                style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.85rem', opacity: selected.size === 0 ? .5 : 1 }}
              >
                {submitting ? <><RefreshCw size={14} className="animate-spin" /> Submitting…</> : <><Zap size={14} /> Submit Batch ({selected.size})</>}
              </button>
              {selected.size === 0 && (
                <span style={{ fontSize: '.8rem', color: 'var(--t4)', alignSelf: 'center' }}>
                  Select claims from the queue first
                </span>
              )}
            </div>
          </div>

          {/* Batch history log */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--bd)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--t1)' }}>Batch Submission Log</span>
              <button className="btn btn-g btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.75rem' }}>
                <Download size={12} /> Export CSV
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)', background: 'var(--n50)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Batch ID</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Time</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Province</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Claims</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Total</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {BATCH_LOG.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--fm)', fontSize: '.75rem', color: 'var(--lilac)' }}>{b.id}</td>
                    <td style={{ padding: '11px 16px', color: 'var(--t3)', fontSize: '.78rem' }}>{b.timestamp}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        fontSize: '.7rem', fontWeight: 700,
                        color: PROVINCE_SYSTEMS[b.province]?.color ?? 'var(--lilac)',
                        background: `${PROVINCE_SYSTEMS[b.province]?.color ?? '#7c3aed'}14`,
                        borderRadius: 6, padding: '2px 8px',
                      }}>{b.province}</span>
                    </td>
                    <td style={{ padding: '11px 16px', fontWeight: 600 }}>{b.claimCount}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--t1)' }}>
                      ${b.totalAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {b.status === 'success' && <span className="badge b-paid">Success</span>}
                      {b.status === 'partial' && <span className="badge b-pending">Partial</span>}
                      {b.status === 'error'   && <span className="badge b-rejected">Error</span>}
                    </td>
                    <td style={{ padding: '11px 16px', color: 'var(--t3)', fontSize: '.78rem', maxWidth: 280 }}>{b.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

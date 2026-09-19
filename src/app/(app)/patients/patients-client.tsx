'use client';

import { useState, useMemo } from 'react';
import {
  Search, Users, Calendar, TrendingUp, ChevronRight,
  ShieldCheck, FileText, Plus,
} from 'lucide-react';
import Link from 'next/link';
import type { PatientRow } from '@/lib/dal';

const AV_COLORS = ['av-1', 'av-2', 'av-3', 'av-4', 'av-5'];
const PROVINCE_COLOR: Record<string, string> = {
  BC: '#059669', AB: '#d97706', ON: '#8b5cf6', MB: '#0891b2',
  SK: '#d97706', QC: '#dc2626', NS: '#0284c7', NB: '#65a30d',
};

function initials(name: string | null): string {
  if (!name) return '??';
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmt$(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function PatientsClient({
  patients,
  mtdRevenue,
}: {
  patients: PatientRow[];
  mtdRevenue: number;
}) {
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'claims' | 'amount'>('recent');

  const provinces = useMemo(() =>
    Array.from(new Set(patients.map(p => p.province))).sort(),
  [patients]);

  const seenThisMonth = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return patients.filter(p => p.last_service_date?.startsWith(m)).length;
  }, [patients]);

  const filtered = useMemo(() => {
    let list = patients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.patient_name ?? '').toLowerCase().includes(q) ||
        p.health_card_no.includes(q),
      );
    }
    if (provinceFilter !== 'all') {
      list = list.filter(p => p.province === provinceFilter);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'claims') return b.claim_count - a.claim_count;
      if (sortBy === 'amount') return b.total_billed - a.total_billed;
      return b.last_service_date.localeCompare(a.last_service_date);
    });
  }, [patients, search, provinceFilter, sortBy]);

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="pt-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          {
            label: 'Total Patients', value: String(patients.length),
            icon: Users, color: 'var(--sky)', bg: 'var(--sky-lt)',
            sub: `${provinces.length} province${provinces.length !== 1 ? 's' : ''}`,
          },
          {
            label: 'Seen This Month', value: String(seenThisMonth),
            icon: Calendar, color: 'var(--ok)', bg: 'var(--ok-lt)',
            sub: 'based on service date',
          },
          {
            label: 'MTD Revenue', value: fmt$(mtdRevenue),
            icon: TrendingUp, color: 'var(--violet)', bg: 'var(--violet-lt)',
            sub: 'from paid claims this month',
          },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="stico" style={{ background: bg, margin: 0, flexShrink: 0 }}>
              <Icon size={18} style={{ color }}/>
            </div>
            <div>
              <div style={{ fontSize: '.7rem', color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: '1.65rem', fontWeight: 400, color: 'var(--sky-dk)', lineHeight: 1, marginBottom: 3 }}>{value}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--t4)' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="tbar" style={{ marginBottom: 16 }}>
        <div className="tbar-l">
          {/* Search */}
          <div className="sr" style={{ minWidth: 280 }}>
            <span className="sr-ico"><Search size={14}/></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or health card…"
            />
          </div>

          {/* Province filter */}
          {provinces.length > 1 && (
            <div className="fpills">
              <button className={`fpill${provinceFilter === 'all' ? ' active' : ''}`} onClick={() => setProvinceFilter('all')}>
                All
                <span className="fpill-count">{patients.length}</span>
              </button>
              {provinces.map(p => {
                const color = PROVINCE_COLOR[p] ?? 'var(--sky)';
                return (
                  <button
                    key={p}
                    className={`fpill${provinceFilter === p ? ' active' : ''}`}
                    onClick={() => setProvinceFilter(p)}
                  >
                    <span className="fpill-dot" style={{ background: color }}/>
                    {p}
                    <span className="fpill-count">{patients.filter(pt => pt.province === p).length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="tbar-r">
          {/* Sort */}
          <div className="vt">
            {([['recent', 'Recent'], ['claims', 'Most Claims'], ['amount', 'Highest $']] as const).map(([k, label]) => (
              <button key={k} className={sortBy === k ? 'active' : ''} onClick={() => setSortBy(k)}>
                {label}
              </button>
            ))}
          </div>
          <Link href="/claims/new" className="btn btn-p">
            <Plus size={14}/> New Claim
          </Link>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {patients.length === 0 ? (
        <div className="card cp" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="empty-ico" style={{ display: 'inline-flex', marginBottom: 14 }}>
            <Users size={24} style={{ color: 'var(--t4)' }}/>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--t2)', marginBottom: 8 }}>No patients yet</div>
          <div style={{ fontSize: '.84rem', color: 'var(--t3)', marginBottom: 18 }}>
            Patients are added automatically when you create claims.
          </div>
          <Link href="/claims/new" className="btn btn-p"><Plus size={14}/> Create First Claim</Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Health Card</th>
                  <th>Date of Birth</th>
                  <th>Province</th>
                  <th>Last Service</th>
                  <th style={{ textAlign: 'center' }}>Claims</th>
                  <th style={{ textAlign: 'right' }}>Total Billed</th>
                  <th/>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'var(--t4)' }}>
                      No patients match your search.
                    </td>
                  </tr>
                )}
                {filtered.map((p, i) => {
                  const provColor = PROVINCE_COLOR[p.province] ?? 'var(--sky)';
                  return (
                    <tr key={p.health_card_no}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className={`av ${AV_COLORS[i % AV_COLORS.length]}`}>
                            {initials(p.patient_name)}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.88rem' }}>
                              {p.patient_name ?? <span style={{ color: 'var(--t4)', fontStyle: 'italic' }}>Name not captured</span>}
                            </div>
                            <div style={{ fontSize: '.72rem', color: 'var(--t4)', marginTop: 1, fontFamily: 'var(--fm)' }}>
                              PHN {p.health_card_no}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="code-chip" style={{ fontFamily: 'var(--fm)', letterSpacing: '.08em' }}>
                          {p.health_card_no}
                        </span>
                      </td>
                      <td style={{ color: 'var(--t2)', fontSize: '.83rem' }}>
                        {p.date_of_birth ? fmtDate(p.date_of_birth) : <span style={{ color: 'var(--t4)' }}>—</span>}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '.72rem', fontWeight: 700, padding: '3px 9px',
                          borderRadius: 20, background: provColor + '14', color: provColor,
                        }}>{p.province}</span>
                      </td>
                      <td style={{ color: 'var(--t3)', fontSize: '.82rem' }}>
                        {fmtDate(p.last_service_date)}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--fm)', fontSize: '.82rem', color: 'var(--t2)' }}>
                        {p.claim_count}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '.88rem' }}>
                        {fmt$(p.total_billed)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <Link
                            href={`/claims?q=${encodeURIComponent(p.health_card_no)}`}
                            className="btn btn-g btn-xs"
                            title="View claims"
                          >
                            <FileText size={12}/>
                          </Link>
                          <Link
                            href={`/eligibility?phn=${encodeURIComponent(p.health_card_no)}&province=${p.province}`}
                            className="btn btn-g btn-xs"
                            title="Check eligibility"
                          >
                            <ShieldCheck size={12}/>
                          </Link>
                          <Link
                            href={`/claims/new?phn=${encodeURIComponent(p.health_card_no)}&province=${p.province}`}
                            className="btn btn-g btn-xs"
                            title="New claim"
                          >
                            <ChevronRight size={13}/>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div style={{
              padding: '10px 22px', borderTop: '1px solid var(--bd)',
              fontSize: '.76rem', color: 'var(--t4)', display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Showing {filtered.length} of {patients.length} patients</span>
              <span>Total billed: <strong style={{ color: 'var(--t2)' }}>
                {fmt$(filtered.reduce((s, p) => s + p.total_billed, 0))}
              </strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

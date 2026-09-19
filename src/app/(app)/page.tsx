import Link from 'next/link';
import { getCurrentContext, getClaimStats, getClaims } from '@/lib/dal';
import {
  TrendingUp, Clock, AlertCircle, Zap,
  Plus, ChevronRight, FileText, ShieldCheck, Receipt, Activity,
} from 'lucide-react';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  paid:      { label: 'Paid',      cls: 'badge b-paid' },
  submitted: { label: 'Submitted', cls: 'badge b-submitted' },
  refused:   { label: 'Refused',   cls: 'badge b-rejected' },
  draft:     { label: 'Draft',     cls: 'badge b-draft' },
  pending:   { label: 'Pending',   cls: 'badge b-pending' },
};

const PROVINCE_COLOR: Record<string, string> = {
  BC: '#059669', AB: '#d97706', ON: '#8b5cf6', MB: '#0891b2',
  SK: '#d97706', QC: '#dc2626', NS: '#0284c7', NB: '#65a30d', NL: '#7c3aed', PE: '#ea580c',
};

function fmt$(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  const [stats, recent] = await Promise.all([
    getClaimStats(ctx.practiceId),
    getClaims(ctx.practiceId, { limit: 8 }),
  ]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const statCards = [
    {
      label: 'MTD Revenue', value: fmt$(stats.mtdRevenue),
      sub: `${stats.paid} paid claim${stats.paid !== 1 ? 's' : ''} this month`,
      icon: TrendingUp, accent: '#8b5cf6',
    },
    {
      label: 'Pending', value: String(stats.draft),
      sub: 'draft claim' + (stats.draft !== 1 ? 's' : '') + ' awaiting submission',
      icon: Clock, accent: '#d97706',
    },
    {
      label: 'Refused', value: String(stats.refused),
      sub: stats.refused > 0 ? 'need attention — review & resubmit' : 'none outstanding',
      icon: AlertCircle, accent: stats.refused > 0 ? '#e11d48' : '#64748b',
    },
    {
      label: 'Submitted Today', value: String(stats.todayCount),
      sub: stats.todayCount > 0 ? fmt$(stats.todayAmount) + ' sent today' : 'no submissions yet today',
      icon: Zap, accent: '#059669',
    },
  ];

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="hero" style={{ marginBottom: 24 }}>
        <div className="hero-l">
          <div className="hero-date">
            {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </div>
          <div className="hero-t">
            {greeting}, Dr. {ctx.email.split('@')[0].split('.').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')}.
          </div>
          <div className="hero-s">
            {stats.refused > 0 && (
              <><span style={{ color: '#e11d48', fontWeight: 700 }}>⚠ {stats.refused} refused</span> claim{stats.refused !== 1 ? 's' : ''} need attention. </>
            )}
            {stats.draft > 0
              ? <><strong>{stats.draft}</strong> draft{stats.draft !== 1 ? 's' : ''} ready to submit.</>
              : <>All drafts submitted — you're up to date.</>}
          </div>
          <div className="hero-actions">
            <Link href="/claims/new" className="btn btn-p btn-sm">
              <Plus size={13}/> New Claim
            </Link>
            {stats.draft > 0 && (
              <Link href="/claims?status=draft" className="btn btn-s btn-sm">
                Submit {stats.draft} Draft{stats.draft !== 1 ? 's' : ''}
              </Link>
            )}
            {stats.refused > 0 && (
              <Link href="/claims?status=refused" className="btn btn-sm" style={{ background: '#fff1f3', color: '#b91c1c', border: '1px solid #fecdd3' }}>
                <AlertCircle size={12}/> Review Refused
              </Link>
            )}
          </div>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <svg viewBox="0 0 220 140" fill="none" style={{ width: '100%', height: '100%', opacity: .65 }}>
            <rect x="20" y="20" width="180" height="100" rx="14" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="1.5"/>
            <rect x="34" y="34" width="100" height="8" rx="4" fill="#c4b5fd"/>
            <rect x="34" y="48" width="70" height="6" rx="3" fill="#e9d5ff"/>
            <rect x="34" y="70" width="152" height="1.5" rx="1" fill="#ddd6fe"/>
            {[0,1,2,3].map(i => (
              <g key={i} transform={`translate(0,${i*16})`}>
                <rect x="34" y="78" width="12" height="12" rx="3" fill="#ede9fe"/>
                <rect x="52" y="81" width="60" height="6" rx="3" fill="#ede9fe"/>
                <rect x="160" y="80" width="26" height="8" rx="4" fill={i === 2 ? '#fde8e8' : '#d1fae5'}/>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="stats">
        {statCards.map(({ label, value, sub, icon: Icon, accent }) => (
          <div className="stat" key={label} style={{ '--accent-color': accent } as React.CSSProperties}>
            <div className="stico" style={{ background: accent + '18' }}>
              <Icon size={18} style={{ color: accent }}/>
            </div>
            <div className="stlbl">{label}</div>
            <div className="stval">{value}</div>
            <div style={{ fontSize: '.74rem', color: 'var(--t3)', lineHeight: 1.4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Two column: recent claims + quick actions ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* Recent claims */}
        <div className="card">
          <div className="cp" style={{ paddingBottom: 0 }}>
            <div className="ch">
              <div>
                <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={15} style={{ color: 'var(--sky)' }}/> Recent Claims
                </div>
                <div className="cs">Live from your billing database</div>
              </div>
              <Link href="/claims" className="btn btn-g btn-sm">
                View all <ChevronRight size={13}/>
              </Link>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="empty" style={{ padding: '32px 22px' }}>
              <div className="empty-ico"><FileText size={22} style={{ color: 'var(--t4)' }}/></div>
              <div style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>No claims yet</div>
              <div style={{ fontSize: '.82rem', color: 'var(--t3)', marginBottom: 14 }}>
                Submit your first claim to get started.
              </div>
              <Link href="/claims/new" className="btn btn-p btn-sm"><Plus size={13}/> New Claim</Link>
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Province</th>
                    <th>Fee Code</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    <th style={{ color: 'var(--t4)' }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(claim => {
                    const cfg = STATUS_CFG[claim.status] ?? STATUS_CFG.draft;
                    const provColor = PROVINCE_COLOR[claim.province] ?? 'var(--sky)';
                    const feeCode = (claim.fee_codes as { code: string }[])[0]?.code ?? '—';
                    return (
                      <tr key={claim.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--t1)' }}>
                            {claim.patient_name || claim.health_card_no}
                          </div>
                          <div style={{ fontFamily: 'var(--fm)', fontSize: '.72rem', color: 'var(--t4)', marginTop: 2 }}>
                            {claim.health_card_no}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700, fontSize: '.72rem', padding: '2px 8px',
                            borderRadius: 20, background: provColor + '14', color: provColor,
                          }}>{claim.province}</span>
                        </td>
                        <td><span className="code-chip">{feeCode}</span></td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--fm)', fontWeight: 600, fontSize: '.88rem' }}>
                          {fmt$(claim.subtotal)}
                        </td>
                        <td><span className={cfg.cls}>{cfg.label}</span></td>
                        <td style={{ color: 'var(--t4)', fontSize: '.76rem' }}>
                          {relDate(claim.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '12px 22px', borderTop: '1px solid var(--bd)' }}>
            <Link href="/claims" style={{ fontSize: '.8rem', color: 'var(--sky-dk)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all {stats.total} claims <ChevronRight size={13}/>
            </Link>
          </div>
        </div>

        {/* Quick actions sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quick actions */}
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 14 }}>Quick actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { href: '/claims/new',  icon: Plus,        label: 'New Claim',            desc: 'Submit a provincial claim',   accent: '#8b5cf6', bg: 'rgba(139,92,246,.08)' },
                { href: '/eligibility', icon: ShieldCheck, label: 'Check Eligibility',     desc: 'Real-time MSP verification',  accent: '#059669', bg: 'rgba(5,150,105,.08)'  },
                { href: '/remittances', icon: Receipt,     label: 'Remittances',            desc: 'Review ERA payments',         accent: '#7c3aed', bg: 'rgba(124,58,237,.08)' },
              ].map(qa => (
                <Link key={qa.href} href={qa.href} className="qa" style={{ padding: '12px 14px', gap: 10 }}>
                  <div className="qa-ic" style={{ background: qa.bg, width: 32, height: 32, borderRadius: 9 }}>
                    <qa.icon size={15} style={{ color: qa.accent }}/>
                  </div>
                  <div>
                    <div className="qa-t" style={{ fontSize: '.84rem' }}>{qa.label}</div>
                    <div className="qa-d" style={{ fontSize: '.72rem' }}>{qa.desc}</div>
                  </div>
                  <ChevronRight size={13} style={{ color: 'var(--t4)', marginLeft: 'auto', flexShrink: 0 }}/>
                </Link>
              ))}
            </div>
          </div>

          {/* Submission pipeline */}
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 14 }}>Pipeline</div>
            {[
              { label: 'Draft',     count: stats.draft,     color: '#94a3b8', href: '/claims?status=draft'     },
              { label: 'Submitted', count: stats.submitted, color: '#8b5cf6', href: '/claims?status=submitted' },
              { label: 'Paid',      count: stats.paid,      color: '#059669', href: '/claims?status=paid'      },
              { label: 'Refused',   count: stats.refused,   color: '#e11d48', href: '/claims?status=refused'   },
            ].map(row => (
              <Link key={row.label} href={row.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bd)', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }}/>
                  <span style={{ fontSize: '.84rem', color: 'var(--t2)', fontWeight: 500 }}>{row.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: '.84rem', color: row.count > 0 ? 'var(--t1)' : 'var(--t4)' }}>
                  {row.count}
                </span>
              </Link>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontSize: '.78rem', color: 'var(--t3)' }}>Total</span>
              <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: '.88rem' }}>{stats.total}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

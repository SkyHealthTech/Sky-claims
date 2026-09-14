'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, Clock, AlertCircle, FileText,
  ShieldCheck, Receipt, ClipboardList, ChevronRight,
  RefreshCw, Plus, AlertTriangle, CheckCircle2, Info,
  Zap, Activity,
} from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────────────────────────
const STATS = [
  {
    label: 'MTD Revenue', value: '$18,420', sub: '+12% vs last month', trend: 'up',
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)',
    glow: '0 8px 24px rgba(124,58,237,.25)',
    bars: [65, 48, 82, 54, 70, 90, 78, 62, 95, 88, 73, 85],
  },
  {
    label: 'Pending', value: '14', sub: 'awaiting submission', trend: 'neutral',
    icon: Clock,
    gradient: 'linear-gradient(135deg,#d97706 0%,#f59e0b 100%)',
    glow: '0 8px 24px rgba(217,119,6,.22)',
    bars: [30, 45, 22, 60, 38, 50, 42, 55, 35, 48, 28, 44],
  },
  {
    label: 'Refused (C12)', value: '3', sub: 'need attention', trend: 'down',
    icon: AlertCircle,
    gradient: 'linear-gradient(135deg,#e11d48 0%,#f43f5e 100%)',
    glow: '0 8px 24px rgba(225,29,72,.22)',
    bars: [8, 12, 5, 15, 9, 3, 11, 7, 14, 6, 10, 3],
  },
  {
    label: 'Submitted Today', value: '28', sub: '$2,104 sent', trend: 'up',
    icon: Zap,
    gradient: 'linear-gradient(135deg,#059669 0%,#10b981 100%)',
    glow: '0 8px 24px rgba(5,150,105,.22)',
    bars: [20, 28, 15, 32, 25, 18, 30, 22, 28, 35, 24, 28],
  },
];

const RECENT_CLAIMS = [
  { id: 'CLM-1042', patient: 'JB', name: 'James Burnham',     code: '00110', dx: 'H52.1', amount: 88.35,  status: 'paid',      date: 'Sep 13' },
  { id: 'CLM-1041', patient: 'CB', name: 'Christine Burrows', code: '00115', dx: 'H40.0', amount: 107.20, status: 'paid',      date: 'Sep 13' },
  { id: 'CLM-1040', patient: 'AM', name: 'Austin Mercer',     code: '00110', dx: 'H52.4', amount: 88.35,  status: 'refused',   date: 'Sep 12' },
  { id: 'CLM-1039', patient: 'LT', name: 'Linda Thorpe',      code: '00111', dx: 'H52.1', amount: 54.00,  status: 'submitted', date: 'Sep 12' },
  { id: 'CLM-1038', patient: 'RC', name: 'Robert Chan',       code: '00110', dx: 'H40.1', amount: 88.35,  status: 'paid',      date: 'Sep 11' },
];

const STATUS_CLS: Record<string, string> = {
  paid:      'badge b-paid',
  submitted: 'badge b-submitted',
  refused:   'badge b-rejected',
  draft:     'badge b-draft',
  pending:   'badge b-pending',
};
const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid', submitted: 'Submitted', refused: 'Refused', draft: 'Draft', pending: 'Pending',
};
const AV_COLOR = ['av-1','av-2','av-3','av-4','av-5'];

const QUICK_ACTIONS = [
  {
    href: '/claims/new', icon: Plus, label: 'New Claim',
    desc: 'Submit a new MSP / provincial claim',
    accent: '#7c3aed', bg: 'rgba(124,58,237,.1)',
  },
  {
    href: '/eligibility', icon: ShieldCheck, label: 'Check Eligibility',
    desc: 'Real-time provincial coverage check',
    accent: '#059669', bg: 'rgba(5,150,105,.1)',
  },
  {
    href: '/remittances', icon: Receipt, label: 'Retrieve Remittances',
    desc: 'Fetch latest ERA files from Teleplan',
    accent: '#a855f7', bg: 'rgba(168,85,247,.1)',
  },
];

const ALERTS = [
  { type: 'warn',  text: '3 claims refused last cycle — C12 service code issue. Review required.' },
  { type: 'info',  text: 'Remittance R2408-04 received. $14,820.00 deposited to your account.' },
  { type: 'ok',    text: 'Teleplan connected. Last submission: today at 08:14 AM — 28 claims.' },
];

const AUDIT = [
  { icon: FileText,     bg: 'rgba(124,58,237,.1)',  color: '#7c3aed', text: 'Claim CLM-1042 paid — $88.35',        time: '2m ago' },
  { icon: CheckCircle2, bg: 'rgba(5,150,105,.1)',   color: '#059669', text: 'Eligibility verified — James Burnham', time: '14m ago' },
  { icon: AlertTriangle,bg: 'rgba(225,29,72,.1)',   color: '#e11d48', text: 'CLM-1040 refused — recheck Dx code',  time: '1h ago' },
  { icon: Receipt,      bg: 'rgba(168,85,247,.1)',  color: '#a855f7', text: 'Remittance file R2408-04 downloaded',  time: '3h ago' },
];

// ── Sparkline micro-chart ──────────────────────────────────────────────────────
function Sparkline({ bars }: { bars: number[] }) {
  const max = Math.max(...bars);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32, marginTop: 10 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(h / max) * 100}%`,
            borderRadius: 3,
            background: i === bars.length - 1
              ? 'rgba(255,255,255,0.95)'
              : 'rgba(255,255,255,0.35)',
            transition: 'height .2s',
          }}
        />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="hero">
        {/* decorative orbs */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', width: 260, height: 260, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(167,139,250,.18) 0%,transparent 70%)',
            top: -80, right: 60,
          }}/>
          <div style={{
            position: 'absolute', width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(124,58,237,.1) 0%,transparent 70%)',
            bottom: -40, right: 180,
          }}/>
        </div>

        <div className="hero-l" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-date">{dateStr}</div>
          <div className="hero-t">
            {greeting}, Dr. Ekeoba
            <span className="hero-tag">BC · MSP</span>
          </div>
          <div className="hero-s">
            <strong>14 claims pending</strong> submission and <strong>3 refusals</strong> need your attention today.
          </div>
          <div className="hero-actions">
            <Link href="/claims/new" className="btn btn-p">
              <Plus size={15} /> New Claim
            </Link>
            <button className="btn btn-s" onClick={handleRefresh}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Right illustration: stylised billing card */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          {/* metric chip */}
          <div style={{
            background: 'white', borderRadius: 14, padding: '10px 16px',
            boxShadow: '0 4px 20px rgba(124,58,237,.18)', display: 'flex', flexDirection: 'column', gap: 2,
            minWidth: 140,
          }}>
            <div style={{ fontSize: '.65rem', fontWeight: 600, color: 'var(--lilac)', textTransform: 'uppercase', letterSpacing: '.06em' }}>MTD Revenue</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--lilac-deepest)', letterSpacing: '-.02em' }}>$18,420</div>
            <div style={{ fontSize: '.7rem', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={11} style={{ color: '#059669' }} />
              <span style={{ color: '#059669', fontWeight: 600 }}>+12%</span> vs last month
            </div>
          </div>
          {/* connection pill */}
          <div style={{
            background: 'white', borderRadius: 24, padding: '6px 14px', fontSize: '.72rem',
            fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 12px rgba(5,150,105,.15)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'block', animation: 'pulse 2s infinite' }}/>
            Teleplan Connected
          </div>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {ALERTS.map((a, i) => (
        <div key={i} className={`alrt al-${a.type === 'warn' ? 'warn' : a.type === 'ok' ? 'ok' : 'info'}`}>
          <span className="alrt-ico">
            {a.type === 'warn' ? <AlertTriangle size={16}/> : a.type === 'ok' ? <CheckCircle2 size={16}/> : <Info size={16}/>}
          </span>
          {a.text}
        </div>
      ))}

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="stats" style={{ marginBottom: 20 }}>
        {STATS.map((s) => (
          <div
            key={s.label}
            className="stat"
            style={{
              background: s.gradient,
              boxShadow: s.glow,
              border: 'none',
              '--accent': s.gradient,
            } as React.CSSProperties}
          >
            {/* icon + trend */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={18} style={{ color: 'white' }} />
              </div>
              <span style={{
                fontSize: '.65rem', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,.85)',
                background: 'rgba(255,255,255,.15)',
                borderRadius: 20, padding: '3px 8px',
              }}>
                {s.sub}
              </span>
            </div>

            {/* value */}
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: '2rem', fontWeight: 700, color: 'white',
                letterSpacing: '-.03em', lineHeight: 1,
              }}>
                {s.value}
              </div>
              <div style={{
                fontSize: '.78rem', color: 'rgba(255,255,255,.75)', marginTop: 4, fontWeight: 500,
              }}>
                {s.label}
              </div>
            </div>

            {/* sparkline */}
            <Sparkline bars={s.bars} />
          </div>
        ))}
      </div>

      {/* ── Two-col: claims + sidebar ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* Recent Claims */}
        <div className="card cp">
          <div className="ch">
            <div>
              <div className="ct">Recent Claims</div>
              <div className="cs">Latest activity from your queue</div>
            </div>
            <Link href="/claims" className="btn btn-g btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Claim ID</th>
                  <th>Code</th>
                  <th>Dx</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_CLAIMS.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span className={`av ${AV_COLOR[i % AV_COLOR.length]}`}>{c.patient}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{c.name}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--t4)' }}>{c.date}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ color: 'var(--lilac)', fontSize: '.8rem' }}>{c.id}</span>
                    </td>
                    <td><span className="code-chip">{c.code}</span></td>
                    <td><span className="icd-chip">{c.dx}</span></td>
                    <td><span className={STATUS_CLS[c.status] ?? 'badge b-draft'}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--ff)', color: 'var(--t1)' }}>
                      ${c.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quick Actions */}
          <div className="card cp">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Zap size={15} style={{ color: 'var(--lilac)' }} />
              <span className="ct">Quick Actions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="qa"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--bd)',
                    background: 'var(--bg2)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    textDecoration: 'none',
                    transition: 'border-color .15s, box-shadow .15s, background .15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--lilac-b)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(124,58,237,.12)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,.04)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg2)';
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: a.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <a.icon size={16} style={{ color: a.accent }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--t1)' }}>{a.label}</div>
                    <div style={{ fontSize: '.71rem', color: 'var(--t4)', marginTop: 1 }}>{a.desc}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card cp">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Activity size={15} style={{ color: 'var(--lilac)' }} />
              <span className="ct">Activity</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {AUDIT.map((a, i) => (
                <div
                  key={i}
                  className="audit-row"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 11, padding: '10px 0',
                    borderBottom: i < AUDIT.length - 1 ? '1px solid var(--bd)' : 'none',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, background: a.bg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                  }}>
                    <a.icon size={13} style={{ color: a.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.81rem', color: 'var(--t1)', fontWeight: 500, lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: '.69rem', color: 'var(--t4)', marginTop: 3 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/audit"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: '.78rem', color: 'var(--lilac)', fontWeight: 600,
                marginTop: 12, textDecoration: 'none',
              }}
            >
              <ClipboardList size={13} /> View full audit log
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

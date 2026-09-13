'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, Clock, AlertCircle, FileText,
  ShieldCheck, Receipt, ClipboardList, ChevronRight,
  RefreshCw, Plus, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────────────────────────
const STATS = [
  {
    label: 'MTD Revenue', value: '$18,420', sub: '↑ 12% vs last month',
    icon: TrendingUp, accent: 'linear-gradient(135deg,#2563eb,#60a5fa)',
    bg: '#eff5ff', iconColor: '#2563eb',
    bars: [65, 48, 82, 54, 70, 90, 78, 62, 95, 88, 73, 85],
    barColor: '#2563eb',
  },
  {
    label: 'Pending', value: '14', sub: 'awaiting submission',
    icon: Clock, accent: 'linear-gradient(135deg,#d97706,#fbbf24)',
    bg: '#fffbeb', iconColor: '#d97706',
    bars: [30, 45, 22, 60, 38, 50, 42, 55, 35, 48, 28, 44],
    barColor: '#d97706',
  },
  {
    label: 'Refused (C12)', value: '3', sub: 'need attention',
    icon: AlertCircle, accent: 'linear-gradient(135deg,#e11d48,#fb7185)',
    bg: '#fff1f3', iconColor: '#e11d48',
    bars: [8, 12, 5, 15, 9, 3, 11, 7, 14, 6, 10, 3],
    barColor: '#e11d48',
  },
  {
    label: 'Submitted Today', value: '28', sub: '$2,104 sent',
    icon: FileText, accent: 'linear-gradient(135deg,#059669,#34d399)',
    bg: '#ecfdf5', iconColor: '#059669',
    bars: [20, 28, 15, 32, 25, 18, 30, 22, 28, 35, 24, 28],
    barColor: '#059669',
  },
];

const RECENT_CLAIMS = [
  { id: 'CLM-1042', patient: 'JB', name: 'James Burnham',     code: '00110', dx: 'H52.1', amount: 88.35,  status: 'paid',      date: 'Aug 5' },
  { id: 'CLM-1041', patient: 'CB', name: 'Christine Burrows', code: '00115', dx: 'H40.0', amount: 107.20, status: 'paid',      date: 'Aug 5' },
  { id: 'CLM-1040', patient: 'AM', name: 'Austin Mercer',     code: '00110', dx: 'H52.4', amount: 88.35,  status: 'refused',   date: 'Aug 4' },
  { id: 'CLM-1039', patient: 'LT', name: 'Linda Thorpe',      code: '00111', dx: 'H52.1', amount: 54.00,  status: 'submitted', date: 'Aug 4' },
  { id: 'CLM-1038', patient: 'RC', name: 'Robert Chan',       code: '00110', dx: 'H40.1', amount: 88.35,  status: 'paid',      date: 'Aug 3' },
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
  { href: '/claims/new',          icon: Plus,        label: 'New Claim',          desc: 'Submit a new MSP / provincial claim', accent: '#2563eb', bg: '#eff5ff' },
  { href: '/eligibility',         icon: ShieldCheck, label: 'Check Eligibility',  desc: 'Real-time provincial coverage check',  accent: '#059669', bg: '#ecfdf5' },
  { href: '/remittances',         icon: Receipt,     label: 'Retrieve Remittances', desc: 'Fetch latest ERA files from Teleplan', accent: '#7c3aed', bg: '#f5f3ff' },
];

const ALERTS = [
  { type: 'warn',  text: '3 claims refused last cycle — C12 service code issue. Review required.' },
  { type: 'info',  text: 'Remittance R2408-04 received. $14,820.00 deposited to your account.' },
  { type: 'ok',    text: 'Teleplan connected. Last submission: today at 08:14 AM — 28 claims.' },
];

const AUDIT = [
  { icon: FileText,    bg: '#eff5ff', color: '#2563eb', text: 'Claim CLM-1042 paid — $88.35',       time: '2m ago' },
  { icon: CheckCircle2, bg: '#ecfdf5', color: '#059669', text: 'Eligibility verified — James Burnham', time: '14m ago' },
  { icon: AlertTriangle, bg: '#fff1f3', color: '#e11d48', text: 'CLM-1040 refused — recheck Dx code', time: '1h ago' },
  { icon: Receipt,     bg: '#f5f3ff', color: '#7c3aed', text: 'Remittance file R2408-04 downloaded', time: '3h ago' },
];

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
      {/* Hero */}
      <div className="hero">
        <div className="hero-l">
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
        <div className="hero-illustration" aria-hidden="true">
          <svg viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <rect x="10" y="20" width="200" height="108" rx="14" fill="white" fillOpacity=".9" stroke="#e6ecf5" strokeWidth="1"/>
            <rect x="22" y="32" width="80" height="10" rx="4" fill="#bfd7ff"/>
            <rect x="22" y="48" width="176" height="8" rx="3" fill="#f1f5f9"/>
            <rect x="22" y="60" width="176" height="8" rx="3" fill="#f1f5f9"/>
            <rect x="22" y="72" width="130" height="8" rx="3" fill="#f1f5f9"/>
            <rect x="130" y="30" width="60" height="14" rx="7" fill="#eff5ff" stroke="#bfd7ff" strokeWidth="1"/>
            <rect x="144" y="35" width="34" height="4" rx="2" fill="#2563eb" fillOpacity=".5"/>
            <circle cx="180" cy="90" r="28" fill="#eff5ff"/>
            <path d="M170 90 L176 97 L192 82" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Alerts */}
      {ALERTS.map((a, i) => (
        <div key={i} className={`alrt al-${a.type === 'warn' ? 'warn' : a.type === 'ok' ? 'ok' : 'info'}`}>
          <span className="alrt-ico">
            {a.type === 'warn' ? <AlertTriangle size={16}/> : a.type === 'ok' ? <CheckCircle2 size={16}/> : <Info size={16}/>}
          </span>
          {a.text}
        </div>
      ))}

      {/* Stats */}
      <div className="stats">
        {STATS.map((s) => (
          <div key={s.label} className="stat" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stico" style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.iconColor }} />
            </div>
            <div className="stlbl">{s.label}</div>
            <div className="stval">{s.value}</div>
            <div className="pill pl-up" style={{ fontSize: '.67rem' }}>{s.sub}</div>
            <div className="bars">
              {s.bars.map((h, i) => (
                <div
                  key={i}
                  className="bar"
                  style={{
                    height: `${h}%`,
                    background: i === s.bars.length - 1 ? s.barColor : s.barColor + '4d',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Two-col: claims + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
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
                    <td><span className="mono" style={{ color: 'var(--sky-dk)' }}>{c.id}</span></td>
                    <td><span className="code-chip">{c.code}</span></td>
                    <td><span className="icd-chip">{c.dx}</span></td>
                    <td><span className={STATUS_CLS[c.status] ?? 'badge b-draft'}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--ff)' }}>${c.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Actions */}
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.href} href={a.href} className="qa" style={{ padding: '14px' }}>
                  <div className="qa-ic" style={{ background: a.bg }}>
                    <a.icon size={17} style={{ color: a.accent }} />
                  </div>
                  <div>
                    <div className="qa-t">{a.label}</div>
                    <div className="qa-d">{a.desc}</div>
                  </div>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', color: 'var(--t4)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 14 }}>Activity</div>
            {AUDIT.map((a, i) => (
              <div key={i} className="audit-row">
                <div className="audit-ic" style={{ background: a.bg }}>
                  <a.icon size={14} style={{ color: a.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.82rem', color: 'var(--t1)', fontWeight: 500, lineHeight: 1.4 }}>{a.text}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--t4)', marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
            <Link href="/audit" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.78rem', color: 'var(--sky)', fontWeight: 600, marginTop: 12, textDecoration: 'none' }}>
              <ClipboardList size={13} /> View full audit log
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

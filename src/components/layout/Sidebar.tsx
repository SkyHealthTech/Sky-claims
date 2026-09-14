'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, ShieldCheck, Receipt,
  Settings, ClipboardList, Users, Plus, LogOut, Globe,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { href: '/',            label: 'Dashboard',    icon: LayoutDashboard, count: null },
  { href: '/claims',      label: 'Claims',        icon: FileText,        count: 14 },
  { href: '/patients',    label: 'Patients',      icon: Users,           count: null },
  { href: '/eligibility', label: 'Eligibility',   icon: ShieldCheck,     count: null },
  { href: '/remittances', label: 'Remittances',   icon: Receipt,         count: null },
  { href: '/audit',       label: 'Audit Log',     icon: ClipboardList,   count: null },
];

// Province → billing system mapping
const PROVINCE_SYSTEM: Record<string, { label: string; color: string }> = {
  BC: { label: 'Teleplan · MSP',  color: '#059669' },
  ON: { label: 'eClaims · OHIP',  color: '#2563eb' },
  AB: { label: 'Netcare · AHCIP', color: '#7c3aed' },
  MB: { label: 'MHSAL',           color: '#0891b2' },
  SK: { label: 'SK Health',       color: '#d97706' },
  QC: { label: 'RAMQ',            color: '#dc2626' },
  NS: { label: 'MSI',             color: '#0284c7' },
  NB: { label: 'Medicare NB',     color: '#65a30d' },
  NL: { label: 'MCP',             color: '#7c3aed' },
  PE: { label: 'PEI Health',      color: '#ea580c' },
};

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [province, setProvince] = useState('BC');

  const sys = PROVINCE_SYSTEM[province] ?? PROVINCE_SYSTEM.BC;

  function handleLogout() {
    // In production: call /api/auth/logout or supabase.auth.signOut()
    router.push('/login');
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`backdrop lg:hidden${open ? ' on' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-mark">
            <div className="sb-icon">
              <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                <path d="M14,34 L74,25 L74,36 L14,45 Z" fill="white"/>
                <path d="M14,49 L74,40 L74,51 L14,60 Z" fill="white"/>
                <path d="M14,64 L74,55 L74,66 L14,75 Z" fill="white"/>
                <path d="M52,4 L44,18 L50,18 L46,32 L59,13 L53,13 Z" fill="#f59e0b"/>
              </svg>
            </div>
            <div>
              <div className="sb-name">Sky Claims</div>
              <div className="sb-tag">Health Billing</div>
            </div>
          </div>
        </div>

        {/* Province selector */}
        <div style={{ padding: '0 12px 10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--n50)', border: '1px solid var(--bd)',
            borderRadius: 10, padding: '7px 10px',
          }}>
            <Globe size={13} style={{ color: 'var(--lilac)', flexShrink: 0 }} />
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: '.75rem', fontWeight: 700, color: 'var(--t1)', cursor: 'pointer',
                fontFamily: 'var(--ff)',
              }}
            >
              {Object.keys(PROVINCE_SYSTEM).map((p) => (
                <option key={p} value={p}>{p} — {PROVINCE_SYSTEM[p].label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* New Claim button */}
        <div style={{ padding: '0 12px 12px' }}>
          <Link
            href="/claims/new"
            className="btn btn-p"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onClose}
          >
            <Plus size={15} /> New Claim
          </Link>
        </div>

        {/* Nav */}
        <nav className="sb-nav">
          <div className="nav-grp">Main</div>
          {NAV.map(({ href, label, icon: Icon, count }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item${active ? ' active' : ''}`}
                onClick={onClose}
              >
                <Icon size={17} />
                {label}
                {count !== null && (
                  <span className="nav-count">{count}</span>
                )}
              </Link>
            );
          })}

          <div className="nav-grp" style={{ marginTop: 8 }}>Account</div>
          <Link
            href="/settings"
            className={`nav-item${pathname.startsWith('/settings') ? ' active' : ''}`}
            onClick={onClose}
          >
            <Settings size={17} /> Settings
          </Link>
        </nav>

        {/* Footer */}
        <div className="sb-foot" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Practice card */}
          <div className="prac-card">
            <div className="prac-av">DR</div>
            <div style={{ minWidth: 0 }}>
              <div className="prac-name">Dr. Ekeoba</div>
              <div className="prac-meta">{province} · OD · V0127</div>
            </div>
          </div>

          {/* Province billing system chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: `${sys.color}14`, border: `1px solid ${sys.color}30`,
            borderRadius: 20, padding: '5px 10px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: sys.color, display: 'block', flexShrink: 0,
            }}/>
            <span style={{ fontSize: '.68rem', fontWeight: 700, color: sys.color }}>
              {sys.label} Connected
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 9,
              background: 'none', border: '1px solid var(--bd)',
              fontSize: '.78rem', fontWeight: 600, color: 'var(--t3)',
              cursor: 'pointer', transition: 'all .15s', width: '100%',
              fontFamily: 'var(--ff)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#e11d48';
              (e.currentTarget as HTMLElement).style.borderColor = '#fecdd3';
              (e.currentTarget as HTMLElement).style.background = '#fff1f3';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--t3)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)';
              (e.currentTarget as HTMLElement).style.background = 'none';
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

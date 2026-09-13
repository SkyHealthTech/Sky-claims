'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, ShieldCheck, Receipt,
  Settings, ClipboardList, Users, Plus,
} from 'lucide-react';

const NAV = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard, count: null },
  { href: '/claims',      label: 'Claims',       icon: FileText,        count: 14 },
  { href: '/patients',    label: 'Patients',     icon: Users,           count: null },
  { href: '/eligibility', label: 'Eligibility',  icon: ShieldCheck,     count: null },
  { href: '/remittances', label: 'Remittances',  icon: Receipt,         count: null },
  { href: '/audit',       label: 'Audit log',    icon: ClipboardList,   count: null },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

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
              {/* Sky S mark */}
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

        {/* Footer: practice card + Teleplan chip */}
        <div className="sb-foot">
          <div className="prac-card">
            <div className="prac-av">DR</div>
            <div style={{ minWidth: 0 }}>
              <div className="prac-name">Dr. Ekeoba</div>
              <div className="prac-meta">BC · OD · V0127</div>
            </div>
          </div>
          <div className="tp-chip">
            <span className="tpdot" />
            Teleplan Connected
          </div>
        </div>
      </aside>
    </>
  );
}

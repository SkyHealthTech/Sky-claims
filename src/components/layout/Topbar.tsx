'use client';
import { usePathname } from 'next/navigation';
import { Search, Menu } from 'lucide-react';
import { useState } from 'react';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/':            { title: 'Dashboard',    sub: 'Overview of your billing activity' },
  '/claims':      { title: 'Claims',       sub: 'Manage and track your MSP / provincial claims' },
  '/patients':    { title: 'Patients',     sub: 'Patient registry and coverage lookup' },
  '/eligibility': { title: 'Eligibility',  sub: 'Real-time provincial coverage verification' },
  '/remittances': { title: 'Remittances',  sub: 'ERA files, payments, and reconciliation' },
  '/audit':       { title: 'Audit Log',    sub: 'Full event history for compliance' },
  '/settings':    { title: 'Settings',     sub: 'Practice info, billing preferences, security' },
  '/billing':     { title: 'Billing',      sub: 'Subscription and payment details' },
};

function getPageMeta(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const found = Object.entries(PAGE_TITLES).find(([key]) => key !== '/' && pathname.startsWith(key));
  return found ? found[1] : { title: 'Sky Claims', sub: '' };
}

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const { title, sub } = getPageMeta(pathname);

  return (
    <header className="topbar">
      <button className="ham" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="tb-title">
        <div>{title}</div>
        {sub && <div className="tb-sub">{sub}</div>}
      </div>

      {/* Global search — hidden on mobile (per-page search bars cover that) */}
      <div className="tb-search">
        <span className="sr-ico">
          <Search size={15} />
        </span>
        <input
          type="search"
          placeholder="Search patients, claims…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search"
        />
      </div>
    </header>
  );
}

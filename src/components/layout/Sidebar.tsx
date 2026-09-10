'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, ShieldCheck, Receipt, Settings, ExternalLink, Eye, Plus, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/',              label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/claims',        label: 'Claims',      icon: FileText },
  { href: '/eligibility',   label: 'Eligibility', icon: ShieldCheck },
  { href: '/remittances',   label: 'Remittances', icon: Receipt },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-60 flex-col glass border-r border-white/[0.05] px-3 py-4 sticky top-0 h-screen shrink-0">
      {/* Logo */}
      <div className="px-2 pb-5 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
          <Receipt className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-display text-[14px] font-bold text-white leading-none">Sky Claims</div>
          <div className="text-[10px] text-purple-400 font-medium tracking-widest uppercase leading-none mt-0.5">MSP Billing</div>
        </div>
      </div>

      {/* Submit button */}
      <Link href="/claims/new" className="btn-purple w-full justify-center mb-4 text-[13px]">
        <Plus className="w-4 h-4" /> Submit Claims
      </Link>

      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={cn('nav-item', active && 'nav-item-active')}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.05] pt-3 space-y-0.5">
        <Link href="/settings" className={cn('nav-item', pathname.startsWith('/settings') && 'nav-item-active')}>
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <Link href="/billing" className={cn('nav-item', pathname.startsWith('/billing') && 'nav-item-active')}>
          <CreditCard className="w-4 h-4" /> Billing
        </Link>
        <a href="https://app.skyhealthtech.ca" target="_blank" rel="noopener" className="nav-item">
          <Eye className="w-4 h-4" /> Sky Chamber EHR <ExternalLink className="w-3 h-3 ml-auto" />
        </a>
        <div className="px-3 pt-2 text-[10px] text-white/20 leading-relaxed">
          Sky Claims · Vendor V0127<br />Build 2026.08
        </div>
      </div>
    </aside>
  );
}

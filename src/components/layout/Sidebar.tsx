'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, ShieldCheck, Receipt,
  Settings, ExternalLink, Plus, CreditCard,
  Users, ClipboardList, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/claims',      label: 'Claims',      icon: FileText },
  { href: '/patients',    label: 'Patients',    icon: Users },
  { href: '/eligibility', label: 'Eligibility', icon: ShieldCheck },
  { href: '/remittances', label: 'Remittances', icon: Receipt },
  { href: '/audit',       label: 'Audit log',   icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="hidden lg:flex w-60 flex-col glass border-r border-white/[0.05] px-3 py-4 sticky top-0 h-screen shrink-0">
      {/* Logo */}
      <div className="px-2 pb-5 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
          {/* Sky S mark */}
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <path d="M14,34 L74,25 L74,36 L14,45 Z" fill="white"/>
            <path d="M14,49 L74,40 L74,51 L14,60 Z" fill="white"/>
            <path d="M14,64 L74,55 L74,66 L14,75 Z" fill="white"/>
            <path d="M52,4 L44,18 L50,18 L46,32 L59,13 L53,13 Z" fill="#f59e0b"/>
          </svg>
        </div>
        <div>
          <div className="font-display text-[14px] font-bold text-white leading-none">Sky Claims</div>
          <div className="text-[10px] text-purple-400 font-medium tracking-widest uppercase leading-none mt-0.5">Health Billing</div>
        </div>
      </div>

      {/* Submit claim button */}
      <Link href="/claims/new" className="btn-purple w-full justify-center mb-4 text-[13px]">
        <Plus className="w-4 h-4" /> New Claim
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
          <ExternalLink className="w-4 h-4" /> Sky Chamber EHR
        </a>
        <button
          onClick={handleSignOut}
          className="nav-item w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
        <div className="px-3 pt-2 text-[10px] text-white/20 leading-relaxed">
          Sky Claims · Vendor V0127
        </div>
      </div>
    </aside>
  );
}

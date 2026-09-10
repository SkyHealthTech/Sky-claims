'use client';
import { useState, useEffect } from 'react';
import {
  CreditCard, Zap, Building2, CheckCircle2, AlertTriangle,
  ExternalLink, Download, ArrowRight, ChevronRight, Gift, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Mock subscription ─────────────────────────────────────── */
const MOCK_SUB = {
  plan: 'Solo',
  status: 'trialing',
  trialEndsAt: '2026-09-07',
  nextBillDate: '2026-09-08',
  billingCycle: 'monthly',
  monthlyPrice: 49,
  annualPrice: 39,
  paymentMethod: { brand: 'Visa', last4: '4242' },
  source: 'standalone', // 'standalone' | 'chamber' (included via Sky Chamber)
};

const PLANS = [
  {
    id: 'solo',
    name: 'Sky Claims Solo',
    monthlyPrice: 49,
    annualPrice: 39,
    providers: '1 provider',
    highlights: ['Teleplan direct submission', 'AI claim scrubbing', 'E45 eligibility', 'ERA reconciliation'],
  },
  {
    id: 'clinic',
    name: 'Sky Claims Clinic',
    monthlyPrice: 99,
    annualPrice: 79,
    providers: 'Unlimited providers',
    highlights: ['Everything in Solo', 'Batch submission', 'Multi-location', 'API access', 'Priority support'],
  },
];

const MOCK_INVOICES = [
  { id: 'inv_001', date: '2026-08-05', amount: 49, status: 'paid' },
  { id: 'inv_002', date: '2026-07-05', amount: 49, status: 'paid' },
  { id: 'inv_003', date: '2026-06-05', amount: 49, status: 'paid' },
];

/* ── Page ──────────────────────────────────────────────────── */
/* ── Inline referral card ──────────────────────────────────────────────────── */
function ClaimsReferralCard() {
  const [code, setCode]     = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Referral code lives in Sky Chamber; fetch via the shared Supabase auth session
    fetch('https://app.skyhealthtech.ca/api/referral/code', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.code) setCode(d.code); })
      .catch(() => {});
  }, []);

  const inviteUrl = code
    ? `https://app.skyhealthtech.ca/login?mode=signup&ref=${code}`
    : null;

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="card p-5 space-y-3 border border-purple-500/20">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
          <Gift className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="font-semibold text-white text-[14px]">Refer a Colleague — Both Get 1 Month Free</div>
          <div className="text-[12px] text-white/40 mt-0.5">Share your invite link. When they subscribe, you each get 1 month of credit automatically.</div>
        </div>
      </div>
      {inviteUrl ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/50 truncate font-mono">{inviteUrl}</div>
          <button onClick={copy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold shrink-0 transition-all ${copied ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-white/50 bg-white/[0.06] border border-white/[0.08]'}`}>
            {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
      ) : (
        <div className="text-[12px] text-white/30">Sign into Sky Chamber to view your referral link.</div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const sub = MOCK_SUB;
  const [cycle, setCycle] = useState<'monthly' | 'annual'>(sub.billingCycle as 'monthly' | 'annual');
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? 'Could not open portal.');
    } catch { alert('Network error.'); }
    finally { setPortalLoading(false); }
  }

  async function startCheckout(planId: string) {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, cycle }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? 'Could not start checkout.');
    } catch { alert('Network error.'); }
    finally { setPortalLoading(false); }
  }

  /* ── Included via Sky Chamber banner ── */
  if (sub.source === 'chamber') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-white tracking-tight mb-6">Billing</h1>
        <div className="card p-6 border border-purple-500/25 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-purple-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[15px]">Sky Claims is included in your Sky Chamber plan</div>
              <div className="text-[12px] text-white/40 mt-0.5">Billing is managed in Sky Chamber EHR → Settings → Billing</div>
            </div>
          </div>
          <a href="https://app.skyhealthtech.ca/settings/billing"
            className="btn flex items-center gap-2 text-[13px] mt-2">
            Manage in Sky Chamber <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-white tracking-tight">Billing</h1>

      {/* ── Current plan ── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-1">Current Plan</div>
            <div className="flex items-center gap-2.5">
              <span className="font-display text-[20px] font-bold text-white">{sub.plan}</span>
              <StatusBadge status={sub.status} />
            </div>
            {sub.status === 'trialing' && (
              <div className="text-[12px] text-amber-300 mt-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Trial ends {sub.trialEndsAt} — add a payment method to continue
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[22px] font-bold text-white">
              ${sub.billingCycle === 'annual' ? sub.annualPrice : sub.monthlyPrice}
              <span className="text-[13px] font-normal text-white/40">/mo</span>
            </div>
            <div className="text-[11px] text-white/30 mt-0.5">
              {sub.billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'} · Next {sub.nextBillDate}
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 text-[13px] text-white/60">
            <CreditCard className="w-4 h-4" />
            {sub.paymentMethod.brand} ···· {sub.paymentMethod.last4}
          </div>
          <div className="flex gap-2">
            <button onClick={openPortal} disabled={portalLoading}
              className="btn text-[12px] py-1.5 px-3">
              {portalLoading ? 'Loading…' : 'Manage Subscription'}
            </button>
            <button onClick={openPortal} disabled={portalLoading}
              className="btn text-[12px] py-1.5 px-3 flex items-center gap-1">
              Invoices <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Billing cycle toggle ── */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-white/40">Billing cycle</span>
        <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
          {(['monthly', 'annual'] as const).map((c) => (
            <button key={c} onClick={() => setCycle(c)}
              className={cn('px-4 py-1.5 text-[12px] font-medium capitalize transition-colors',
                cycle === c ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60')}>
              {c}
              {c === 'annual' && <span className="ml-1.5 text-emerald-400 text-[10px] font-bold">save 20%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plan cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.name.toLowerCase().includes(sub.plan.toLowerCase());
          const price = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
          return (
            <div key={plan.id} className={cn('card p-5 space-y-4 flex flex-col transition-all',
              isCurrent ? 'border-purple-500/40' : 'border-white/[0.07]')}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-bold text-white text-[15px]">{plan.name}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{plan.providers}</div>
                </div>
                <div className="text-right">
                  <div className="text-[20px] font-bold text-white">${price}</div>
                  <div className="text-[10px] text-white/30">/mo</div>
                </div>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-[12px] text-white/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="flex items-center gap-1.5 text-[12px] text-purple-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Current plan
                </div>
              ) : (
                <button onClick={() => startCheckout(plan.id)} disabled={portalLoading}
                  className="btn-purple w-full justify-center text-[13px] py-2.5">
                  Upgrade to {plan.name.split(' ').pop()} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Referral ── */}
      <ClaimsReferralCard />

      {/* ── Upsell: Sky Chamber bundle ── */}
      <div className="card p-5 border border-sky-500/20 bg-sky-500/[0.04] flex items-center gap-4">
        <Building2 className="w-8 h-8 text-sky-400 shrink-0" />
        <div className="flex-1">
          <div className="font-semibold text-white/80 text-[14px]">Switch to Sky Chamber EHR</div>
          <div className="text-[12px] text-white/40 mt-0.5">
            Get Sky Claims free as part of Sky Chamber — plus full EHR, optical, AI scribe, and more. Starts at $99/mo.
          </div>
        </div>
        <a href="https://app.skyhealthtech.ca/signup" className="btn flex items-center gap-1.5 text-[13px] shrink-0">
          Learn more <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {/* ── Invoice history ── */}
      <div className="card p-5 space-y-3">
        <div className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Invoice History</div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-white/30 border-b border-white/[0.05]">
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Amount</th>
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-right py-2 font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map((inv) => (
              <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-2.5 text-white/50">{inv.date}</td>
                <td className="py-2.5 text-white/80 font-medium">${inv.amount}.00 CAD</td>
                <td className="py-2.5"><StatusBadge status={inv.status} /></td>
                <td className="py-2.5 text-right">
                  <button onClick={openPortal} className="text-white/30 hover:text-white/60 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={openPortal} className="text-[12px] text-white/30 hover:text-white/50 flex items-center gap-1 transition-colors">
          View all in Stripe <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <p className="text-[11px] text-white/20 text-center">
        All prices in CAD. Cancel any time — your data is exportable for 90 days after cancellation.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:   { label: 'Active',   cls: 'badge-ok' },
    trialing: { label: 'Trial',    cls: 'badge-sky' },
    past_due: { label: 'Past Due', cls: 'badge-danger' },
    paid:     { label: 'Paid',     cls: 'badge-ok' },
    open:     { label: 'Open',     cls: 'badge-warn' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'badge-muted' };
  return <span className={cls}>{label}</span>;
}

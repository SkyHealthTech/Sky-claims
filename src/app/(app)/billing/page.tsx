'use client';
import { useState, useEffect } from 'react';
import {
  CheckCircle2, CreditCard, ExternalLink, Sparkles, ShieldCheck,
  Loader2, AlertTriangle, RefreshCw, Star,
} from 'lucide-react';

/* ── Plans (must match /api/billing/checkout planIds) ─────────────────────── */
const PLANS = [
  {
    id: 'solo' as const,
    name: 'Claims Solo',
    price: '$49',
    cycle: '/mo',
    desc: '1 provider · unlimited claims · all provinces',
    features: [
      'MSP / AHCIP / OHIP claim submission',
      'Real-time E45 eligibility checks',
      'ERA remittance reconciliation',
      'AI claim scrubbing',
      'Patient registry (unlimited)',
      'Audit log (7-year retention)',
      'Teleplan E45 + batch claims',
      'Sky Chamber EHR integration',
    ],
    featured: false,
  },
  {
    id: 'clinic' as const,
    name: 'Claims Clinic',
    price: '$99',
    cycle: '/mo',
    desc: 'Unlimited providers · all provinces · priority support',
    features: [
      'Everything in Solo',
      'Multi-provider billing batching',
      'Extended health + TPA billing',
      'Bulk eligibility checking',
      'Advanced analytics',
      'Priority support (4h SLA)',
      'Custom fee schedule import',
      'API access',
    ],
    featured: true,
  },
] as const;
type PlanId = typeof PLANS[number]['id'];
type Cycle = 'monthly' | 'annual';

export default function BillingPage() {
  const [portalLoading, setPortalLoading]     = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null);
  const [cycle, setCycle]     = useState<Cycle>('monthly');
  const [error, setError]     = useState('');
  const [hasStripe, setHasStripe] = useState<boolean | null>(null); // null = unknown

  /* Detect if user already has a Stripe subscription by trying the portal endpoint */
  useEffect(() => {
    fetch('/api/billing/subscription-status', { method: 'GET' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setHasStripe(!!data?.active))
      .catch(() => setHasStripe(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    setError('');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Could not open billing portal.');
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
      setPortalLoading(false);
    }
  }

  async function startCheckout(planId: PlanId) {
    setCheckoutLoading(planId);
    setError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, cycle }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Could not start checkout.');
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
      setCheckoutLoading(null);
    }
  }

  /* Check URL for Stripe return params */
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const checkoutSuccess   = params.get('checkout') === 'success';
  const checkoutCancelled = params.get('checkout') === 'cancelled';

  return (
    <div style={{ maxWidth: 860 }}>

      {/* Success / cancelled banners */}
      {checkoutSuccess && (
        <div className="alrt al-ok" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={15} className="alrt-ico" />
          <span><strong>Subscription activated!</strong> Your 30-day free trial is now running. No charges until the trial ends.</span>
        </div>
      )}
      {checkoutCancelled && (
        <div className="alrt al-warn" style={{ marginBottom: 20 }}>
          <AlertTriangle size={15} className="alrt-ico" />
          <span>Checkout was cancelled — you can start a plan anytime below.</span>
        </div>
      )}
      {error && (
        <div className="alrt al-err" style={{ marginBottom: 20 }}>
          <AlertTriangle size={15} className="alrt-ico" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Manage existing subscription ─────────────────────────────────── */}
      <div className="card cp" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="ct" style={{ marginBottom: 4 }}>Subscription</div>
            <div className="cs">Manage your Sky Claims plan, invoices, and payment method</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              className="btn btn-p"
              onClick={openPortal}
              disabled={portalLoading}
            >
              {portalLoading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Opening…</>
                : <><CreditCard size={14} /> Manage Billing</>
              }
            </button>
            <a
              href="https://billing.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-s"
            >
              <ExternalLink size={14} /> Invoices
            </a>
          </div>
        </div>

        <div className="div" />

        {/* Trial banner */}
        <div style={{ display: 'flex', alignItems: 'start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--sky-lt)', border: '1px solid var(--sky-b)' }}>
          <ShieldCheck size={16} style={{ color: 'var(--sky)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: '.84rem', fontWeight: 700, color: 'var(--sky-dk)', marginBottom: 3 }}>30-day free trial</div>
            <div style={{ fontSize: '.76rem', color: 'var(--t2)', lineHeight: 1.5 }}>
              No charges until your trial expires. Cancel or switch plans anytime via <strong>Manage Billing</strong> above. Your MSP/AHCIP payments from Health Insurance BC are always deposited directly to your registered bank — Sky Health never holds your funds.
            </div>
          </div>
        </div>

        <div className="div" />

        {/* Quick feature overview */}
        <div className="ct" style={{ marginBottom: 14, fontSize: '.88rem' }}>Current plan includes</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
          {[
            '1 provider account',
            'Unlimited MSP claims',
            'Real-time E45 eligibility checks',
            'ERA remittance reconciliation',
            'AI claim scrubbing',
            'Patient registry',
            'Audit log (7-year retention)',
            'Teleplan E45 + batch claims',
          ].map((f) => (
            <div key={f} className="comp-row" style={{ padding: '7px 0' }}>
              <div className="comp-ic" style={{ background: 'var(--ok-lt)', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={11} style={{ color: 'var(--ok)' }} />
              </div>
              <div style={{ fontSize: '.84rem', fontWeight: 500 }}>{f}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan picker ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="ct" style={{ marginBottom: 2 }}>Upgrade your plan</div>
          <div className="cs">All plans include 30-day free trial · Canadian GST/HST where applicable</div>
        </div>
        {/* Billing cycle toggle */}
        <div className="vt">
          <button className={cycle === 'monthly' ? 'active' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
          <button className={cycle === 'annual'  ? 'active' : ''} onClick={() => setCycle('annual')}>
            Annual <span style={{ fontSize: '.66rem', color: 'var(--ok)', fontWeight: 700, marginLeft: 4 }}>–20%</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {PLANS.map((plan) => {
          const annualPrice = plan.id === 'solo' ? '$39' : '$79';
          const displayPrice = cycle === 'annual' ? annualPrice : plan.price;
          const isLoading = checkoutLoading === plan.id;

          return (
            <div
              key={plan.id}
              className="card"
              style={{
                padding: '22px',
                position: 'relative',
                ...(plan.featured ? {
                  borderColor: 'var(--lilac)',
                  boxShadow: '0 0 0 2px rgba(139,92,246,.15), var(--sh-lg)',
                } : {}),
              }}
            >
              {plan.featured && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--lilac)', color: '#fff', padding: '3px 14px',
                  borderRadius: 20, fontSize: '.68rem', fontWeight: 700,
                  letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Star size={10} fill="#fff" /> Most Popular
                </div>
              )}

              <div style={{ fontSize: '.68rem', fontWeight: 700, color: plan.featured ? 'var(--lilac)' : 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--ff)', fontSize: '2.1rem', fontWeight: 400, letterSpacing: '-.03em', color: 'var(--sky-dk)', lineHeight: 1 }}>{displayPrice}</span>
                <span style={{ fontSize: '.78rem', color: 'var(--t3)', marginLeft: 2 }}>{plan.cycle}</span>
                {cycle === 'annual' && <span style={{ fontSize: '.68rem', color: 'var(--ok)', fontWeight: 700, marginLeft: 8 }}>Save 20%</span>}
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 18 }}>{plan.desc}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.8rem', color: 'var(--t2)' }}>
                    <CheckCircle2 size={13} style={{ color: plan.featured ? 'var(--lilac)' : 'var(--sky)', flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </div>
                ))}
              </div>

              <button
                className={`btn ${plan.featured ? 'btn-p' : 'btn-s'}`}
                style={{
                  width: '100%', justifyContent: 'center',
                  ...(plan.featured ? { background: 'linear-gradient(135deg, var(--lilac), var(--lilac-dk))' } : {}),
                }}
                onClick={() => startCheckout(plan.id)}
                disabled={isLoading || !!checkoutLoading}
              >
                {isLoading
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Starting trial…</>
                  : <><Sparkles size={13} /> Start 30-day trial — {displayPrice}{plan.cycle}</>
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Referral banner */}
      <div className="card" style={{ padding: '18px 22px', background: 'linear-gradient(135deg, var(--lilac-lt), var(--sky-lt))', border: '1px solid var(--lilac-b)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--lilac)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Star size={18} fill="#fff" style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>Referral Program</div>
            <div style={{ fontSize: '.78rem', color: 'var(--t2)' }}>Refer a colleague and earn 1 month free for every provider who signs up. No limit.</div>
          </div>
          <a
            href="/referral"
            className="btn btn-s"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Get referral link
          </a>
        </div>
      </div>
    </div>
  );
}

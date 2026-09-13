'use client';
import { CheckCircle2, CreditCard, ExternalLink } from 'lucide-react';

export default function BillingPage() {
  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card cp" style={{ marginBottom: 16 }}>
        <div className="ct" style={{ marginBottom: 6 }}>Subscription</div>
        <div className="cs" style={{ marginBottom: 20 }}>Manage your Sky Claims plan and payment method</div>
        <div className="alrt al-ok" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={15} className="alrt-ico" />
          <span><strong>Solo Plan</strong> — Active · $49/mo + GST · Renews October 12, 2026</span>
        </div>
        <div className="sum-box">
          <div className="srow"><span style={{ color: 'var(--t3)' }}>Plan</span><span style={{ fontWeight: 600 }}>Sky Claims Solo</span></div>
          <div className="srow"><span style={{ color: 'var(--t3)' }}>Billing cycle</span><span>Monthly</span></div>
          <div className="srow"><span style={{ color: 'var(--t3)' }}>Next charge</span><span>Oct 12, 2026 · $51.45 CAD</span></div>
          <div className="srow"><span style={{ color: 'var(--t3)' }}>Payment method</span><span style={{ fontFamily: 'var(--fm)' }}>Visa ···· 4242</span></div>
          <div className="srow"><span style={{ color: 'var(--t3)' }}>Status</span><span className="badge b-active">Active</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <a
            href="https://billing.stripe.com/p/login/test_00g000"
            target="_blank" rel="noopener"
            className="btn btn-p"
          >
            <CreditCard size={14} /> Manage Billing
          </a>
          <a
            href="https://billing.stripe.com/p/login/test_00g000"
            target="_blank" rel="noopener"
            className="btn btn-s"
          >
            <ExternalLink size={14} /> View Invoices
          </a>
        </div>
      </div>

      <div className="card cp">
        <div className="ct" style={{ marginBottom: 14 }}>Included in Solo</div>
        {[
          '1 provider account',
          'Unlimited MSP claims',
          'Real-time E45 eligibility checks',
          'ERA remittance reconciliation',
          'AI claim scrubbing',
          'Patient registry',
          'Audit log (7-year retention)',
          'Teleplan E45 + batch claims',
        ].map((feature) => (
          <div key={feature} className="comp-row">
            <div className="comp-ic" style={{ background: 'var(--ok-lt)' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--ok)' }} />
            </div>
            <div style={{ fontSize: '.84rem', fontWeight: 500 }}>{feature}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

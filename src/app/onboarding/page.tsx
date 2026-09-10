'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, User, Building2, CreditCard, Sparkles,
  ChevronRight, CheckCircle2, ArrowRight, ArrowLeft,
  Shield, Info, ExternalLink, Rocket, Lock, FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/* ──────────────────────────────────────────────
   Types & constants
────────────────────────────────────────────── */
const SUPPORTED_PROVINCES = ['BC', 'AB', 'ON'] as const;
const OTHER_PROVINCES = ['SK','MB','QC','NB','NS','PE','NL','NT','NU','YT'] as const;
type SupportedProvince = typeof SUPPORTED_PROVINCES[number];

const STEPS = [
  { id: 'province',  label: 'Province',    icon: MapPin },
  { id: 'practice',  label: 'Practice',     icon: Building2 },
  { id: 'provider',  label: 'Provider',     icon: User },
  { id: 'billing',   label: 'Credentials',  icon: CreditCard },
  { id: 'plan',      label: 'Choose Plan',  icon: Sparkles },
  { id: 'launch',    label: 'Launch',       icon: Rocket },
] as const;
type StepId = typeof STEPS[number]['id'];

const ROLES = [
  { value: 'OD',    label: 'Optometrist (OD)' },
  { value: 'MD',    label: 'Ophthalmologist (MD)' },
  { value: 'GP',    label: 'Physician / GP' },
  { value: 'ADMIN', label: 'Billing Admin' },
  { value: 'OTHER', label: 'Other' },
];

const PLANS = [
  {
    id: 'solo' as const,
    name: 'Claims Solo',
    price: '$49',
    desc: '1 provider · unlimited claims',
    features: [
      'MSP / AHCIP / OHIP claim submission',
      'Real-time eligibility checks',
      'ERA reconciliation + remittances',
      'Sky Chamber EHR integration',
    ],
    featured: false,
  },
  {
    id: 'clinic' as const,
    name: 'Claims Clinic',
    price: '$99',
    desc: 'Unlimited providers · unlimited claims',
    features: [
      'Everything in Solo',
      'Multi-provider billing batching',
      'Extended health + TPA billing',
      'Priority support',
    ],
    featured: true,
  },
];

type State = {
  province: string;
  practiceName: string; phone: string; city: string;
  firstName: string; lastName: string; role: string; licenceNumber: string;
  // Billing credentials
  payeeNumber: string; practitionerNumber: string;
  pracId: string; businessArrangement: string;
  ohipBillingNumber: string;
  // Plan
  selectedPlan: '' | 'solo' | 'clinic';
};

const INIT: State = {
  province: '',
  practiceName: '', phone: '', city: '',
  firstName: '', lastName: '', role: 'OD', licenceNumber: '',
  payeeNumber: '', practitionerNumber: '',
  pracId: '', businessArrangement: '',
  ohipBillingNumber: '',
  selectedPlan: '',
};

const SUPPORT_EMAIL = 'support@skyhealthtech.ca';
const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL ?? '';

/* ──────────────────────────────────────────────
   Main page
────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [state, setState] = useState<State>(INIT);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === STEPS.length - 1;
  const isSkippable = ['billing', 'plan'].includes(step.id);

  const set = (k: keyof State, v: string) => setState((s) => ({ ...s, [k]: v }));

  const canAdvance = (): boolean => {
    if (step.id === 'province') return !!state.province;
    if (step.id === 'practice') return !!state.practiceName;
    if (step.id === 'provider') return !!state.firstName && !!state.lastName;
    return true;
  };

  const advance = async () => {
    if (isLast) { setSaving(true); await finish(); return; }
    setStepIdx((i) => i + 1);
  };
  const skip = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));

  async function choosePlan(planId: 'solo' | 'clinic') {
    set('selectedPlan', planId);
    setStripeLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, trial: true }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) { window.location.href = url; return; }
      }
    } catch { /* fall through */ }
    setStripeLoading(false);
    setStepIdx((i) => i + 1);
  }

  async function finish() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).from('practices').update({
        name: state.practiceName,
        province: state.province,
        city: state.city,
        phone: state.phone,
        onboarding_done: true,
      }).eq('owner_id', user.id);

      await (supabase as any).from('providers').update({
        first_name: state.firstName,
        last_name: state.lastName,
        role: state.role,
        licence_number: state.licenceNumber || null,
        payee_number: state.payeeNumber || null,
        practitioner_number: state.practitionerNumber || null,
        prac_id: state.pracId || null,
        business_arrangement: state.businessArrangement || null,
        ohip_billing_number: state.ohipBillingNumber || null,
      }).eq('user_id', user.id);

      setDone(true);
      setSaving(false);
      setTimeout(() => router.push('/claims'), 2000);
    } catch {
      setSaving(false);
    }
  }

  if (done) return <Celebration />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1035 50%, #0f0a1e 100%)' }}>

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c5cbf, #b39ddb)' }}>
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-[18px] text-white tracking-tight">Sky Claims</span>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1.5 mb-8 flex-wrap justify-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isDone   = i < stepIdx;
          const isActive = i === stepIdx;
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                isActive ? 'text-[#b39ddb] border-[#7c5cbf]/50' :
                isDone   ? 'text-emerald-400 border-emerald-500/25' :
                           'text-white/25 border-white/[0.06]'
              }`}
              style={isActive ? { background: 'rgba(124,92,191,0.12)' } :
                     isDone   ? { background: 'rgba(52,211,153,0.08)' } :
                                { background: 'rgba(255,255,255,0.03)' }}>
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-white/15 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className={`w-full rounded-2xl p-8 shadow-2xl transition-all border border-white/[0.07]`}
        style={{
          background: 'rgba(255,255,255,0.03)',
          maxWidth: step.id === 'plan' ? '560px' : '480px',
        }}>

        {step.id === 'province'  && <ProvinceStep  state={state} set={set} />}
        {step.id === 'practice'  && <PracticeStep  state={state} set={set} />}
        {step.id === 'provider'  && <ProviderStep  state={state} set={set} />}
        {step.id === 'billing'   && <BillingStep   state={state} set={set} />}
        {step.id === 'plan'      && <PlanStep      state={state} onChoose={choosePlan} stripeLoading={stripeLoading} />}
        {step.id === 'launch'    && <LaunchStep province={state.province} />}

        {/* Nav */}
        {step.id !== 'plan' && (
          <div className="flex items-center gap-3 mt-8">
            {!isFirst && (
              <button onClick={() => setStepIdx((i) => i - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] text-white/50 hover:text-white/80 border border-white/[0.07] hover:border-white/20 transition-all">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button
              onClick={advance}
              disabled={!canAdvance() || saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: (!canAdvance() || saving)
                  ? undefined
                  : 'linear-gradient(135deg, #7c5cbf, #9d7fd4)',
                boxShadow: (!canAdvance() || saving) ? undefined : '0 4px 20px rgba(124,92,191,0.35)',
              }}>
              {saving ? 'Saving…' : isLast ? 'Enter Sky Claims' : 'Continue'}
              {!saving && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        {isSkippable && step.id !== 'plan' && (
          <button onClick={skip}
            className="w-full mt-3 text-center text-[12px] text-white/25 hover:text-white/50 transition-colors">
            Skip for now — add in Settings → Billing
          </button>
        )}
      </div>

      <p className="mt-5 text-[11px] text-white/20">Step {stepIdx + 1} of {STEPS.length}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Shared components
────────────────────────────────────────────── */
function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[20px] font-bold text-white tracking-tight">{title}</h2>
      <p className="text-[13px] text-white/40 mt-1">{sub}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', hint, optional }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string; optional?: boolean }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[12px] font-medium text-white/50 mb-1.5">
        {label}
        {optional && <span className="text-white/25 font-normal">(optional)</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl text-white placeholder:text-white/20 text-[14px] focus:outline-none transition-all border"
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderColor: 'rgba(255,255,255,0.09)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(124,92,191,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      />
      {hint && <p className="text-[11px] text-white/30 mt-1.5">{hint}</p>}
    </div>
  );
}

function ReadonlyField({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[12px] font-medium text-white/50 mb-1.5">
        {label} <Lock className="w-3 h-3 text-white/20" />
      </label>
      <div className="w-full px-3.5 py-2.5 rounded-xl text-white/40 text-[13px] font-mono select-all border border-white/[0.05]"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        {value}
      </div>
      {note && <p className="text-[11px] text-white/25 mt-1.5">{note}</p>}
    </div>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl mt-4 border"
      style={{ background: 'rgba(124,92,191,0.07)', borderColor: 'rgba(124,92,191,0.25)' }}>
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#b39ddb' }} />
      <p className="text-[12px] text-white/50 leading-relaxed">{children}</p>
    </div>
  );
}

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="py-3 rounded-xl text-[13px] font-semibold border transition-all"
      style={{
        background: active ? 'rgba(124,92,191,0.2)' : 'rgba(255,255,255,0.03)',
        borderColor: active ? 'rgba(124,92,191,0.45)' : 'rgba(255,255,255,0.08)',
        color: active ? '#c4aee8' : 'rgba(255,255,255,0.5)',
      }}>
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────
   Step components
────────────────────────────────────────────── */
function ProvinceStep({ state, set }: { state: State; set: (k: keyof State, v: string) => void }) {
  return (
    <>
      <StepHeader
        title="Which province do you bill in?"
        sub="Sets your fee schedule, claim format, and intermediary connection."
      />

      <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2">Fully supported</p>
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {SUPPORTED_PROVINCES.map((p) => (
          <button key={p} onClick={() => set('province', p)}
            className="py-4 rounded-xl text-[14px] font-bold border transition-all flex flex-col items-center gap-1"
            style={{
              background: state.province === p ? 'rgba(124,92,191,0.2)' : 'rgba(255,255,255,0.03)',
              borderColor: state.province === p ? 'rgba(124,92,191,0.45)' : 'rgba(255,255,255,0.08)',
              color: state.province === p ? '#c4aee8' : 'rgba(255,255,255,0.5)',
            }}>
            {p}
            <span className="text-[9px] font-normal opacity-60">
              {p === 'BC' ? 'MSP / Teleplan' : p === 'AB' ? 'AHCIP / H-Link' : 'OHIP / MC EDT'}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2">Coming soon — private pay in the meantime</p>
      <div className="grid grid-cols-5 gap-2">
        {OTHER_PROVINCES.map((p) => (
          <button key={p} onClick={() => set('province', p)}
            className="py-2.5 rounded-xl text-[12px] font-medium border transition-all"
            style={{
              background: state.province === p ? 'rgba(124,92,191,0.15)' : 'rgba(255,255,255,0.02)',
              borderColor: state.province === p ? 'rgba(124,92,191,0.35)' : 'rgba(255,255,255,0.06)',
              color: state.province === p ? '#c4aee8' : 'rgba(255,255,255,0.30)',
            }}>
            {p}
          </button>
        ))}
      </div>

      {state.province && (
        <div className="mt-4 text-[12px] text-white/40 rounded-xl px-4 py-3 border border-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          {state.province === 'BC' && '✓ MSP fee schedule loaded · Teleplan integration available (Vendor V0127)'}
          {state.province === 'AB' && '✓ AHCIP fee schedule loaded · H-Link integration available'}
          {state.province === 'ON' && '✓ OHIP fee schedule loaded · MC EDT integration available'}
          {!['BC','AB','ON'].includes(state.province) && `✓ ${state.province} selected — private pay mode. Provincial billing integration coming soon.`}
        </div>
      )}
    </>
  );
}

function PracticeStep({ state, set }: { state: State; set: (k: keyof State, v: string) => void }) {
  return (
    <>
      <StepHeader title="Your practice" sub="Used on claim headers, receipts, and ERA reports." />
      <div className="space-y-4">
        <Field label="Practice Name" value={state.practiceName} onChange={(v) => set('practiceName', v)} placeholder="Eye Central Optometry" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={state.city} onChange={(v) => set('city', v)} placeholder="Vancouver" optional />
          <Field label="Phone" value={state.phone} onChange={(v) => set('phone', v)} placeholder="604-555-0100" type="tel" optional />
        </div>
      </div>
    </>
  );
}

function ProviderStep({ state, set }: { state: State; set: (k: keyof State, v: string) => void }) {
  return (
    <>
      <StepHeader title="Billing provider" sub="The provider whose credentials appear on claims." />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" value={state.firstName} onChange={(v) => set('firstName', v)} placeholder="Austin" />
          <Field label="Last Name"  value={state.lastName}  onChange={(v) => set('lastName', v)}  placeholder="Ekeoba" />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-2">Role</label>
          <div className="grid grid-cols-1 gap-1.5">
            {ROLES.map((r) => (
              <button key={r.value} onClick={() => set('role', r.value)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] border transition-all"
                style={{
                  background: state.role === r.value ? 'rgba(124,92,191,0.2)' : 'rgba(255,255,255,0.03)',
                  borderColor: state.role === r.value ? 'rgba(124,92,191,0.45)' : 'rgba(255,255,255,0.08)',
                  color: state.role === r.value ? '#c4aee8' : 'rgba(255,255,255,0.5)',
                }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <Field
          label="Licence / Registration Number"
          value={state.licenceNumber}
          onChange={(v) => set('licenceNumber', v)}
          placeholder="CHCPBC-XXXX · CPSBC-XXXXX · CPSO-XXXXXX"
          hint="College or provincial registration number."
          optional
        />
      </div>
    </>
  );
}

function BillingStep({ state, set }: { state: State; set: (k: keyof State, v: string) => void }) {
  const prov = state.province;
  return (
    <>
      <StepHeader
        title="Billing credentials"
        sub="Saved securely and pre-filled on every claim. You can skip and add later."
      />

      {prov === 'BC' && (
        <div className="space-y-4">
          <Field
            label="MSP Payee Number"
            value={state.payeeNumber}
            onChange={(v) => set('payeeNumber', v)}
            placeholder="e.g. 12345"
            hint="5-digit number from HIBC. Payments deposit directly to your registered bank account."
            optional
          />
          <Field
            label="MSP Practitioner Number"
            value={state.practitionerNumber}
            onChange={(v) => set('practitionerNumber', v)}
            placeholder="e.g. 12345"
            hint="Usually the same as your payee number."
            optional
          />
          <ReadonlyField
            label="Teleplan Intermediary (Vendor DC)"
            value="V0127 — Sky Health Technologies"
            note="Sky Health is your registered Teleplan vendor. No separate registration needed."
          />
          <div>
            <p className="text-[11px] text-white/30 mb-2 font-medium uppercase tracking-wider">Optional forms</p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'EFT Enrollment / Direct Deposit (FIN312)', url: 'https://www2.gov.bc.ca/assets/gov/government/services-for-government-and-broader-public-sector/bc-bid-resources/goods-and-services-catalogue/forms/fin312.pdf' },
                { label: 'MSP Payee Registration (HLTH 5609)', url: 'https://www2.gov.bc.ca/assets/gov/health/practitioner-pro/hlth5609.pdf' },
              ].map((f) => (
                <a key={f.label} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] transition-colors"
                  style={{ color: 'rgba(179,157,219,0.7)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#b39ddb'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(179,157,219,0.7)'}>
                  <ExternalLink className="w-3 h-3 shrink-0" /> {f.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {prov === 'AB' && (
        <div className="space-y-4">
          <Field
            label="PRAC ID (Practitioner ID)"
            value={state.pracId}
            onChange={(v) => set('pracId', v)}
            placeholder="e.g. 12345678"
            hint="Alberta Health Practitioner ID (AHC11234)."
            optional
          />
          <Field
            label="Business Arrangement Number"
            value={state.businessArrangement}
            onChange={(v) => set('businessArrangement', v)}
            placeholder="e.g. 9876543"
            hint="Links your PRAC ID to your payment account (AHC11236)."
            optional
          />
          <ReadonlyField
            label="H-Link Submitter"
            value="Sky Health Technologies (pre-configured)"
            note="No SFTP keys or separate H-Link registration needed."
          />
          <a href="https://www.alberta.ca/ahcip-register-as-a-provider.aspx" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[12px]"
            style={{ color: 'rgba(179,157,219,0.7)' }}>
            <ExternalLink className="w-3 h-3 shrink-0" /> AHCIP Provider Registration (Alberta Health)
          </a>
        </div>
      )}

      {prov === 'ON' && (
        <div className="space-y-4">
          <Field
            label="OHIP Billing Number"
            value={state.ohipBillingNumber}
            onChange={(v) => set('ohipBillingNumber', v)}
            placeholder="e.g. A12345"
            hint="6-character OHIP billing number from the Ministry of Health."
            optional
          />
          <ReadonlyField
            label="MC EDT Service Provider"
            value="Sky Health Technologies (enrolled)"
            note="No separate MC EDT enrollment needed."
          />
          <a href="https://www.ontario.ca/page/medical-claims-electronic-data-transfer" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[12px]"
            style={{ color: 'rgba(179,157,219,0.7)' }}>
            <ExternalLink className="w-3 h-3 shrink-0" /> MC EDT Information (Ministry of Health)
          </a>
        </div>
      )}

      {!['BC','AB','ON'].includes(prov) && (
        <div className="p-4 rounded-xl text-[13px] text-white/40 border border-white/[0.07]"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          {prov} is in private pay mode. Provincial billing credentials will be available when your province's integration launches.
        </div>
      )}

      <InfoNote>
        Sky Health Technologies acts as your authorized billing intermediary. Your provincial health authority pays you directly — Sky Health never receives or holds your MSP/AHCIP payments.
      </InfoNote>
    </>
  );
}

function PlanStep({ state, onChoose, stripeLoading }:
  { state: State; onChoose: (plan: 'solo' | 'clinic') => void; stripeLoading: boolean }) {
  return (
    <>
      <StepHeader title="Choose your plan" sub="All plans include a 30-day free trial. No charges until your trial ends." />

      {/* Trial banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl mb-6 border"
        style={{ background: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.22)' }}>
        <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-emerald-300">30-day free trial is active</p>
          <p className="text-[12px] text-white/40 mt-0.5">
            No charges until your trial expires. Cancel or pause anytime in <strong className="text-white/60">Settings → Billing</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {PLANS.map((plan) => (
          <div key={plan.id} className="relative rounded-xl border p-5 flex flex-col transition-all"
            style={{
              background: plan.featured
                ? 'linear-gradient(135deg, rgba(124,92,191,0.2), rgba(124,92,191,0.08))'
                : 'rgba(255,255,255,0.03)',
              borderColor: plan.featured ? 'rgba(124,92,191,0.4)' : 'rgba(255,255,255,0.08)',
            }}>
            {plan.featured && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: '#7c5cbf' }}>
                Most Popular
              </div>
            )}
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">{plan.name}</div>
            <div className="flex items-baseline gap-0.5 mb-0.5">
              <span className="text-[28px] font-bold text-white leading-none">{plan.price}</span>
              <span className="text-[11px] text-white/35">/mo</span>
            </div>
            <div className="text-[10px] text-white/30 mb-4">{plan.desc}</div>
            <ul className="space-y-2 flex-1 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-[11px] text-white/50 leading-tight">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#b39ddb' }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => onChoose(plan.id)}
              disabled={stripeLoading}
              className="w-full py-2.5 rounded-lg text-[12px] font-semibold transition-all text-white disabled:opacity-40"
              style={{
                background: plan.featured
                  ? 'linear-gradient(135deg, #7c5cbf, #9d7fd4)'
                  : 'rgba(255,255,255,0.07)',
                border: plan.featured ? 'none' : '1px solid rgba(255,255,255,0.10)',
                boxShadow: plan.featured ? '0 4px 16px rgba(124,92,191,0.35)' : undefined,
              }}>
              {stripeLoading ? 'Loading…' : `Choose ${plan.name.replace('Claims ', '')}`}
            </button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-white/25 text-center mb-3">
        CAD · HST/GST where applicable ·{' '}
        <a href="https://skyhealthtech.ca/pricing.html#claims" target="_blank" rel="noopener noreferrer"
          className="transition-colors" style={{ color: 'rgba(179,157,219,0.6)' }}>
          Full comparison →
        </a>
      </p>
      <p className="text-[11px] text-white/25 text-center">
        Not sure? Choose a plan anytime before your trial ends in <strong className="text-white/35">Settings → Billing</strong>.
      </p>
    </>
  );
}

function LaunchStep({ province }: { province: string }) {
  const bcTips = province === 'BC';
  const abTips = province === 'AB';
  const onTips = province === 'ON';

  const tips = [
    { icon: '🔍', title: 'Run an eligibility check', desc: `Go to Eligibility → enter the patient's ${bcTips ? 'PHN' : abTips ? 'Alberta Health card #' : 'HIN'} to confirm coverage before the visit.` },
    { icon: '📋', title: 'Submit your first claim', desc: 'Claims → New Claim → fill the service date, diagnosis, and fee code. Sky Claims pre-fills your provider and payee numbers.' },
    { icon: '📥', title: 'Review remittances',       desc: `${bcTips ? 'MSP' : abTips ? 'AHCIP' : 'OHIP'} remittances are pulled automatically. Go to Remittances to reconcile payments and review rejections.` },
    { icon: '⚙️', title: 'Complete billing setup',   desc: 'Settings → Billing to add your credentials and test your Teleplan/H-Link connection if you skipped that step.' },
    { icon: '🔗', title: 'Link Sky Chamber EHR',     desc: 'If you use Sky Chamber, visit Settings → Integrations to connect both platforms — claims flow from the exam room.' },
  ];

  return (
    <>
      <StepHeader title="You're in. Let's bill." sub="Here's how to hit the ground running." />
      <div className="space-y-2.5">
        {tips.map((t) => (
          <div key={t.title} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-[18px] shrink-0">{t.icon}</span>
            <div>
              <div className="text-[13px] font-semibold text-white/80">{t.title}</div>
              <div className="text-[11px] text-white/35 mt-0.5">{t.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Walkthrough CTA */}
      {CALENDLY ? (
        <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2.5 w-full px-4 py-3 rounded-xl border border-white/[0.07] transition-all group"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-[18px]">📅</span>
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-white/60">Book a free billing walkthrough</div>
            <div className="text-[11px] text-white/30">20 min — we'll set up your Teleplan connection live.</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
        </a>
      ) : (
        <a href={`mailto:${SUPPORT_EMAIL}?subject=Sky%20Claims%20billing%20walkthrough`}
          className="mt-4 flex items-center gap-2.5 w-full px-4 py-3 rounded-xl border border-white/[0.07] transition-all group"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-[18px]">✉️</span>
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-white/60">Request a billing walkthrough</div>
            <div className="text-[11px] text-white/30">{SUPPORT_EMAIL} — we'll set up your connection live.</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
        </a>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────
   Celebration
────────────────────────────────────────────── */
function Celebration() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1035 50%, #0f0a1e 100%)' }}>
      <div className="w-full max-w-sm text-center">
        <div className="text-[52px] mb-3">🎉</div>
        <h1 className="text-[26px] font-bold text-white tracking-tight">Ready to bill.</h1>
        <p className="text-[13px] text-white/40 mt-1.5 mb-6">Taking you to your claims queue…</p>
        <div className="p-4 rounded-xl mb-5 text-left border"
          style={{ background: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.22)' }}>
          <p className="text-[12px] text-emerald-300 font-semibold mb-1">30-day free trial is active</p>
          <p className="text-[11px] text-white/40">
            No charges until your trial expires. Cancel or pause anytime in{' '}
            <strong className="text-white/60">Settings → Billing</strong>.
            Add billing credentials anytime in <strong className="text-white/60">Settings → Billing → Connect</strong>.
          </p>
        </div>
        <a
          href={CALENDLY || `mailto:${SUPPORT_EMAIL}?subject=Sky%20Claims%20walkthrough`}
          target={CALENDLY ? '_blank' : undefined}
          rel={CALENDLY ? 'noopener noreferrer' : undefined}
          className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl border border-white/[0.08] transition-all text-left"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span className="text-[18px]">{CALENDLY ? '📅' : '✉️'}</span>
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-white/60">
              {CALENDLY ? 'Book a billing walkthrough' : 'Request a billing walkthrough'}
            </div>
            <div className="text-[11px] text-white/30">We'll set up your Teleplan/H-Link connection live.</div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
        </a>
      </div>
    </div>
  );
}

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

/* ── Sky Claims plan IDs ─────────────────────────────────────────────────────
   Add these price IDs to .env.local after creating products in Stripe:
   STRIPE_PRICE_CLAIMS_SOLO_MONTHLY=price_xxx
   STRIPE_PRICE_CLAIMS_SOLO_ANNUAL=price_xxx
   STRIPE_PRICE_CLAIMS_CLINIC_MONTHLY=price_xxx
   STRIPE_PRICE_CLAIMS_CLINIC_ANNUAL=price_xxx
   ─────────────────────────────────────────────────────────────────────────── */
export type ClaimsPlanId = 'claims_solo' | 'claims_clinic';
export type BillingCycle = 'monthly' | 'annual';

export function getClaimsPriceId(plan: ClaimsPlanId, cycle: BillingCycle): string {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}` as keyof NodeJS.ProcessEnv;
  const id = process.env[key];
  if (!id) throw new Error(`Missing env var: ${key}`);
  return id;
}

export const CLAIMS_PLAN_NAMES: Record<ClaimsPlanId, string> = {
  claims_solo:   'Sky Claims Solo',
  claims_clinic: 'Sky Claims Clinic',
};

export const CLAIMS_PLAN_PRICES_CAD: Record<ClaimsPlanId, { monthly: number; annual: number }> = {
  claims_solo:   { monthly: 49, annual: 39 },
  claims_clinic: { monthly: 99, annual: 79 },
};

/** Normalise the plan key sent from the billing page ('solo' | 'clinic') */
export function normalisePlanId(raw: string): ClaimsPlanId {
  if (raw === 'solo'   || raw === 'claims_solo')   return 'claims_solo';
  if (raw === 'clinic' || raw === 'claims_clinic') return 'claims_clinic';
  throw new Error(`Unknown Sky Claims plan: ${raw}`);
}

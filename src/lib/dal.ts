/**
 * Sky Claims — Data Access Layer
 * Server-only helpers. Import only from Server Components, Route Handlers, or Server Actions.
 */
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

// ── Auth + Practice ───────────────────────────────────────────────────────────

export async function getCurrentContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('practice_memberships')
    .select('practice_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership?.practice_id) redirect('/login');
  return {
    userId: user.id,
    email: user.email ?? '',
    practiceId: membership.practice_id as string,
    role: (membership.role ?? 'staff') as string,
  };
}

// ── Claims ────────────────────────────────────────────────────────────────────

export type ClaimRow = {
  id: string;
  practice_id: string;
  provider_id: string | null;
  province: string;
  patient_name: string | null;
  health_card_no: string;
  date_of_birth: string | null;
  service_date: string;
  diagnosis_code: string | null;
  fee_codes: { code: string; desc: string; fee: number }[];
  subtotal: number;
  claim_note: string | null;
  intermediary_ref: string | null;
  batch_id: string | null;
  status: 'draft' | 'submitted' | 'paid' | 'refused' | 'pending';
  submitted_at: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  rejection_code: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export async function getClaims(
  practiceId: string,
  opts?: { status?: string; province?: string; limit?: number },
): Promise<ClaimRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from('claims')
    .select('*')
    .eq('practice_id', practiceId)
    .order('created_at', { ascending: false });

  if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status);
  if (opts?.province) q = q.eq('province', opts.province);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data } = await q;
  return (data ?? []) as ClaimRow[];
}

export type ClaimStats = {
  total: number;
  draft: number;
  submitted: number;
  paid: number;
  refused: number;
  mtdRevenue: number;
  todayCount: number;
  todayAmount: number;
};

export async function getClaimStats(practiceId: string): Promise<ClaimStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('claims')
    .select('status, subtotal, paid_amount, service_date, submitted_at')
    .eq('practice_id', practiceId);

  const all = (data ?? []) as Array<{
    status: string; subtotal: number; paid_amount: number | null;
    service_date: string; submitted_at: string | null;
  }>;

  const today = new Date().toISOString().slice(0, 10);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);

  const todayClaims = all.filter(c => (c.submitted_at ?? '').startsWith(today));
  const paidThisMonth = all.filter(
    c => c.status === 'paid' && (c.service_date ?? '').startsWith(startOfMonth.slice(0, 7)),
  );

  return {
    total:       all.length,
    draft:       all.filter(c => c.status === 'draft').length,
    submitted:   all.filter(c => c.status === 'submitted').length,
    paid:        all.filter(c => c.status === 'paid').length,
    refused:     all.filter(c => c.status === 'refused').length,
    mtdRevenue:  paidThisMonth.reduce((s, c) => s + (c.paid_amount ?? c.subtotal), 0),
    todayCount:  todayClaims.length,
    todayAmount: todayClaims.reduce((s, c) => s + c.subtotal, 0),
  };
}

export async function getClaimById(practiceId: string, claimId: string): Promise<ClaimRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('claims')
    .select('*')
    .eq('practice_id', practiceId)
    .eq('id', claimId)
    .maybeSingle();
  return (data ?? null) as ClaimRow | null;
}

// ── Eligibility ───────────────────────────────────────────────────────────────

export type EligCheck = {
  id: string;
  practice_id: string;
  province: string;
  health_card_no: string;
  patient_name: string | null;
  date_of_birth: string | null;
  checked_at: string;
  eligible: boolean | null;
  coverage_type: string | null;
  message: string | null;
  raw_response: Record<string, unknown> | null;
};

export async function getEligibilityHistory(
  practiceId: string,
  limit = 10,
): Promise<EligCheck[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('eligibility_checks')
    .select('*')
    .eq('practice_id', practiceId)
    .order('checked_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as EligCheck[];
}

export async function saveEligibilityCheck(
  practiceId: string,
  check: Omit<EligCheck, 'id' | 'practice_id' | 'checked_at'>,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from('eligibility_checks').insert({
    ...check,
    practice_id: practiceId,
    checked_at: new Date().toISOString(),
  });
}

// ── Remittances ───────────────────────────────────────────────────────────────

export type RemittRow = {
  id: string;
  practice_id: string;
  province: string;
  remittance_date: string;
  period_start: string | null;
  period_end: string | null;
  total_claims: number;
  total_paid: number;
  total_rejected: number;
  total_held: number;
  raw_data: Record<string, unknown> | null;
  processed_at: string;
  created_at: string;
};

// ── Patients (derived from claims) ───────────────────────────────────────────

export type PatientRow = {
  health_card_no: string;
  patient_name: string | null;
  date_of_birth: string | null;
  province: string;
  claim_count: number;
  total_billed: number;
  last_service_date: string;
};

export async function getPatients(practiceId: string): Promise<PatientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('claims')
    .select('health_card_no, patient_name, date_of_birth, province, subtotal, service_date')
    .eq('practice_id', practiceId)
    .order('service_date', { ascending: false });

  if (!data?.length) return [];

  // Aggregate by health_card_no
  const map = new Map<string, PatientRow>();
  for (const row of data as Array<{
    health_card_no: string; patient_name: string | null;
    date_of_birth: string | null; province: string;
    subtotal: number; service_date: string;
  }>) {
    const existing = map.get(row.health_card_no);
    if (existing) {
      existing.claim_count += 1;
      existing.total_billed += row.subtotal ?? 0;
      if (row.service_date > existing.last_service_date) {
        existing.last_service_date = row.service_date;
        if (row.patient_name) existing.patient_name = row.patient_name;
      }
    } else {
      map.set(row.health_card_no, {
        health_card_no: row.health_card_no,
        patient_name: row.patient_name,
        date_of_birth: row.date_of_birth,
        province: row.province,
        claim_count: 1,
        total_billed: row.subtotal ?? 0,
        last_service_date: row.service_date,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.last_service_date.localeCompare(a.last_service_date),
  );
}

export async function getRemittances(practiceId: string): Promise<RemittRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('remittances')
    .select('*')
    .eq('practice_id', practiceId)
    .order('remittance_date', { ascending: false });
  return (data ?? []) as RemittRow[];
}

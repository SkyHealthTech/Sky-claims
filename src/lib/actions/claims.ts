'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../supabase/server';
import { getCurrentContext } from '../dal';

export type ClaimFormState = {
  error?: string;
  claimId?: string;
  success?: boolean;
};

/** Save or update a claim draft */
export async function saveClaim(
  _prev: ClaimFormState,
  formData: FormData,
): Promise<ClaimFormState> {
  try {
    const ctx = await getCurrentContext();
    const supabase = await createClient();

    const claimId = formData.get('claim_id') as string | null;
    const province = (formData.get('province') as string) || 'BC';
    const feeCode = formData.get('fee_code') as string;
    const feeDesc = formData.get('fee_desc') as string;
    const feeAmount = parseFloat((formData.get('fee_amount') as string) || '0');
    const dxCode = ((formData.get('dx_code') as string) || '').split(' — ')[0].trim();
    const phn = ((formData.get('phn') as string) || '').replace(/\s/g, '');
    const dob = (formData.get('dob') as string) || null;
    const dos = formData.get('dos') as string;
    const patientName = formData.get('patient_name') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!phn || !dos || !feeCode) {
      return { error: 'PHN, date of service, and fee code are required.' };
    }

    const payload = {
      practice_id:    ctx.practiceId,
      province,
      health_card_no: phn,
      date_of_birth:  dob || null,
      service_date:   dos,
      patient_name:   patientName || null,
      diagnosis_code: dxCode || null,
      fee_codes:      [{ code: feeCode, desc: feeDesc, fee: feeAmount }],
      subtotal:       feeAmount,
      claim_note:     notes || null,
      status:         'draft',
    };

    if (claimId) {
      const { error } = await supabase
        .from('claims')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', claimId)
        .eq('practice_id', ctx.practiceId);
      if (error) return { error: error.message };
      revalidatePath('/claims');
      return { success: true, claimId };
    } else {
      const { data, error } = await supabase
        .from('claims')
        .insert(payload)
        .select('id')
        .single();
      if (error) return { error: error.message };
      revalidatePath('/claims');
      return { success: true, claimId: data.id };
    }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ── Province → API route mapping ──────────────────────────────────────────────
const PROVINCE_SUBMIT_ROUTE: Record<string, string> = {
  BC: '/api/teleplan/submit',
  AB: '/api/ahcip/submit',
  ON: '/api/mcedt/submit',
  MB: '/api/epics/submit',
};

/**
 * Submit one or more draft claims, routing each group to the correct
 * provincial billing system (Teleplan / H-Link / MCEDT / EPiCS).
 *
 * Claims are grouped by province, submitted in parallel, and all
 * successfully-submitted claims are marked 'submitted' in a single update.
 */
export async function submitClaims(claimIds: string[]): Promise<ClaimFormState> {
  try {
    const ctx = await getCurrentContext();
    const supabase = await createClient();

    // Fetch the claims to submit
    const { data: claims, error: fetchErr } = await supabase
      .from('claims')
      .select('*')
      .in('id', claimIds)
      .eq('practice_id', ctx.practiceId)
      .eq('status', 'draft');

    if (fetchErr) return { error: fetchErr.message };
    if (!claims?.length) return { error: 'No draft claims found.' };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

    // ── Group claims by province ─────────────────────────────────────────────
    const byProvince = new Map<string, typeof claims>();
    for (const claim of claims as Array<{ province: string } & Record<string, unknown>>) {
      const prov = claim.province ?? 'BC';
      if (!byProvince.has(prov)) byProvince.set(prov, []);
      byProvince.get(prov)!.push(claim);
    }

    // ── Submit each province group in parallel ───────────────────────────────
    type SubmitOutcome =
      | { ok: true; province: string; batchRef: string; ids: string[] }
      | { ok: false; province: string; error: string; ids: string[] };

    const outcomes = await Promise.all(
      Array.from(byProvince.entries()).map(async ([province, provClaims]): Promise<SubmitOutcome> => {
        const route = PROVINCE_SUBMIT_ROUTE[province] ?? PROVINCE_SUBMIT_ROUTE.BC;
        const ids   = provClaims.map((c) => (c as { id: string }).id);
        try {
          const res = await fetch(`${baseUrl}${route}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ claims: provClaims }),
          });
          const result = await res.json() as { batchRef?: string; error?: string };
          if (!res.ok) {
            return { ok: false, province, error: result.error ?? `${province} submission failed`, ids };
          }
          return {
            ok: true,
            province,
            batchRef: result.batchRef ?? `BATCH-${province}-${Date.now()}`,
            ids,
          };
        } catch (e: unknown) {
          return {
            ok: false,
            province,
            error: e instanceof Error ? e.message : `${province} network error`,
            ids,
          };
        }
      }),
    );

    // ── Collect results ──────────────────────────────────────────────────────
    const now      = new Date().toISOString();
    const failed   = outcomes.filter((o): o is Extract<SubmitOutcome, { ok: false }> => !o.ok);
    const succeeded = outcomes.filter((o): o is Extract<SubmitOutcome, { ok: true }> => o.ok);

    // Mark all successfully-submitted claims
    for (const outcome of succeeded) {
      await supabase
        .from('claims')
        .update({
          status:       'submitted',
          submitted_at: now,
          batch_id:     outcome.batchRef,
          updated_at:   now,
        })
        .in('id', outcome.ids)
        .eq('practice_id', ctx.practiceId);
    }

    revalidatePath('/claims');
    revalidatePath('/');

    // ── Return ───────────────────────────────────────────────────────────────
    if (failed.length > 0 && succeeded.length === 0) {
      // All provinces failed
      const msgs = failed.map((f) => `${f.province}: ${f.error}`).join('; ');
      return { error: msgs };
    }

    if (failed.length > 0) {
      // Partial success — surface which provinces failed
      const msgs = failed.map((f) => `${f.province}: ${f.error}`).join('; ');
      return { success: true, error: `Partial success. Some claims were not submitted — ${msgs}` };
    }

    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/** Update a single claim's status (e.g. resubmit refused) */
export async function updateClaimStatus(
  claimId: string,
  status: string,
  extra?: { rejection_code?: string; rejection_reason?: string; paid_amount?: number; paid_at?: string },
): Promise<{ error?: string }> {
  try {
    const ctx = await getCurrentContext();
    const supabase = await createClient();

    const { error } = await supabase
      .from('claims')
      .update({ status, ...extra, updated_at: new Date().toISOString() })
      .eq('id', claimId)
      .eq('practice_id', ctx.practiceId);

    if (error) return { error: error.message };
    revalidatePath('/claims');
    revalidatePath('/');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ── Batch claims ──────────────────────────────────────────────────────────────

export type BatchPatient = {
  health_card_no: string;
  patient_name?: string;
  date_of_birth?: string;
  province: string;
  // per-patient overrides; if null use the shared defaults
  fee_code?: string;
  fee_desc?: string;
  fee_amount?: number;
  dx_code?: string;
  notes?: string;
};

export type BatchClaimPayload = {
  province: string;
  dos: string;
  // shared defaults
  fee_code: string;
  fee_desc: string;
  fee_amount: number;
  dx_code: string;
  patients: BatchPatient[];
};

export type BatchResult = {
  saved: number;
  errors: { phn: string; error: string }[];
};

export async function saveBatchClaims(payload: BatchClaimPayload): Promise<BatchResult> {
  const ctx = await getCurrentContext();
  const supabase = await createClient();

  const result: BatchResult = { saved: 0, errors: [] };

  for (const p of payload.patients) {
    const feeCode   = p.fee_code   ?? payload.fee_code;
    const feeDesc   = p.fee_desc   ?? payload.fee_desc;
    const feeAmount = p.fee_amount ?? payload.fee_amount;
    const dxCode    = (p.dx_code   ?? payload.dx_code).split(' — ')[0].trim();

    const row = {
      practice_id:    ctx.practiceId,
      province:       p.province ?? payload.province,
      health_card_no: p.health_card_no.replace(/\s/g, ''),
      patient_name:   p.patient_name   || null,
      date_of_birth:  p.date_of_birth  || null,
      service_date:   payload.dos,
      diagnosis_code: dxCode           || null,
      fee_codes:      [{ code: feeCode, desc: feeDesc, fee: feeAmount }],
      subtotal:       feeAmount,
      claim_note:     p.notes          || null,
      status:         'draft',
    };

    const { error } = await supabase.from('claims').insert(row);
    if (error) {
      result.errors.push({ phn: p.health_card_no, error: error.message });
    } else {
      result.saved += 1;
    }
  }

  revalidatePath('/claims');
  revalidatePath('/');
  return result;
}

/** Delete a draft claim */
export async function deleteClaim(claimId: string): Promise<{ error?: string }> {
  try {
    const ctx = await getCurrentContext();
    const supabase = await createClient();

    const { error } = await supabase
      .from('claims')
      .delete()
      .eq('id', claimId)
      .eq('practice_id', ctx.practiceId)
      .eq('status', 'draft');   // Only delete drafts

    if (error) return { error: error.message };
    revalidatePath('/claims');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

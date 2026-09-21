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

/** Submit one or more draft claims via Teleplan (or mock) */
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

    // Call the Teleplan submit API route
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/teleplan/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claims }),
    });

    const result = await res.json();
    if (!res.ok) return { error: result.error ?? 'Submission failed.' };

    const batchRef: string = result.batchRef ?? `BATCH-${Date.now()}`;
    const now = new Date().toISOString();

    // Mark claims as submitted
    const { error: updErr } = await supabase
      .from('claims')
      .update({
        status: 'submitted',
        submitted_at: now,
        batch_id: batchRef,
        updated_at: now,
      })
      .in('id', claimIds)
      .eq('practice_id', ctx.practiceId);

    if (updErr) return { error: updErr.message };

    revalidatePath('/claims');
    revalidatePath('/');
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

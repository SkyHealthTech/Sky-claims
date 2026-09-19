'use server';

import { getCurrentContext, saveEligibilityCheck } from '../dal';

export async function recordEligibilityCheck(check: {
  province: string;
  health_card_no: string;
  patient_name?: string;
  date_of_birth?: string;
  eligible: boolean;
  coverage_type?: string;
  message?: string;
  raw_response?: Record<string, unknown>;
}) {
  try {
    const ctx = await getCurrentContext();
    await saveEligibilityCheck(ctx.practiceId, {
      province:        check.province,
      health_card_no:  check.health_card_no,
      patient_name:    check.patient_name ?? null,
      date_of_birth:   check.date_of_birth ?? null,
      eligible:        check.eligible,
      coverage_type:   check.coverage_type ?? null,
      message:         check.message ?? null,
      raw_response:    check.raw_response ?? null,
    });
  } catch {
    // Best-effort — don't fail the UI if the save fails
  }
}

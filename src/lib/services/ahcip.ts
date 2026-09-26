/**
 * src/lib/services/ahcip.ts
 *
 * Production service layer for AHCIP H-Link electronic claims submission.
 * Wraps the Node.js hlink/ module (CommonJS) for use in Next.js API routes.
 *
 * The hlink/ module handles:
 *   - 254-char fixed-width batch record building
 *   - MOD-10 claim number check digit
 *   - SFTP upload/download to getfile.health.alberta.ca
 *
 * This module provides a clean TypeScript interface on top.
 */

import type { ClaimRow } from '@/lib/dal';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AhcipSubmitResult = {
  batchRef: string;
  batchNum: number;
  claimCount: number;
  filename: string;
  uploadedAt: string;
};

export type AhcipRemittanceFile = {
  name: string;
  size: number;
  modifiedAt: string;
};

// ── Lazy-load hlink modules ────────────────────────────────────────────────────
// These CommonJS modules live outside the Next.js src tree (hlink/).
// We use require() so they are loaded at runtime (not bundled), and wrapped
// in try/catch so the route degrades gracefully if the module path is wrong.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HlinkModules = { claims: any; sftp: any; cfg: any };

function requireHlink(): HlinkModules {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const claims = require('../../../../../hlink/claims');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sftp   = require('../../../../../hlink/sftp');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cfg    = require('../../../../../hlink/config');
    return { claims, sftp, cfg };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`hlink module not found: ${msg}`);
  }
}

// ── Claim row → H-Link segments ───────────────────────────────────────────────

/**
 * Convert a Sky Claims ClaimRow into a set of H-Link transaction records.
 * Each claim becomes a CIB1 header segment + optional CPD1 + CIB1 claim data.
 *
 * Alberta H-Link field mapping:
 *   health_card_no → ULI (PHN for Alberta, 9 numeric chars padded)
 *   date_of_birth  → patientDOB (YYYYMMDD)
 *   service_date   → serviceDate (YYYYMMDD)
 *   fee_codes[0]   → serviceCode + feeAmount
 *   diagnosis_code → diagCode (ICD-9 or ICD-10, first letter + digits)
 *   provider_id    → practitionerNumber (from practice config)
 */
function claimToHlinkSegments(
  claim: ClaimRow,
  claimNumber: string,
  { claims, cfg }: HlinkModules,
): string[] {
  const config = cfg.loadConfig();
  const prefix     = config.prefix;     // e.g. 'HZV'
  const sourceCode = config.sourceCode; // e.g. 'SC'

  const feeEntry = (claim.fee_codes as { code: string; fee: number }[])[0];
  const feeCode   = feeEntry?.code ?? '';
  const feeAmount = feeEntry?.fee ?? claim.subtotal ?? 0;

  // Derive claim number sequence from the passed claimNumber string
  // claimNumber format: HZV26SC0000001 (prefix 3 + year 2 + src 2 + seq 7 + check 1)
  const seqStr = claimNumber.slice(prefix.length + 2 + sourceCode.length, -1); // 7 digits
  const seqNum = parseInt(seqStr, 10) || 1;

  // H-Link service date: YYYYMMDD
  const svcDate = claim.service_date?.replace(/-/g, '') ?? '';
  // DOB
  const dob = claim.date_of_birth?.replace(/-/g, '') ?? '';
  // PHN — Alberta ULI, 9 digits, zero-padded
  const uli = claim.health_card_no.replace(/\D/g, '').slice(0, 9).padStart(9, '0');

  // Patient name — last, first (max 25 chars)
  const nameParts = (claim.patient_name ?? '').split(' ');
  const lastName  = nameParts[nameParts.length - 1]?.slice(0, 15) ?? '';
  const firstName = nameParts.slice(0, -1).join(' ').slice(0, 10) ?? '';

  // Fee as cents-string for H-Link (e.g. $97.74 → '09774')
  const feeStr = Math.round(feeAmount * 100).toString().padStart(8, '0');

  // Diagnosis code — strip ICD description suffix if present (e.g. 'H52.1 — Myopia' → 'H521')
  const rawDx  = (claim.diagnosis_code ?? '').split(' — ')[0].replace(/\./g, '').slice(0, 5);
  const diagCode = rawDx.toUpperCase().padEnd(5, ' ');

  const segs: string[] = [];

  // CIB1 — claim information basic
  const cib1 = claims.buildCIB1({
    prefix,
    sourceCode,
    seqNum,
    claimNum: claimNumber,
    actionCode: 'A', // original submission
    uli,
    lastName,
    firstName,
    dob,
    serviceDate: svcDate,
    serviceCode: feeCode.replace(/\./g, '').slice(0, 7).padEnd(7, ' '),
    feeAmount: feeStr,
    diagCode,
    practitionerNum: (claim.provider_id ?? process.env.AHCIP_PRACTITIONER_NUM ?? '').slice(0, 9).padStart(9, '0'),
  });
  segs.push(cib1);

  return segs;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Build an H-Link batch from an array of ClaimRows and upload it to
 * Alberta Health's SFTP server.
 *
 * Returns a batchRef string that can be stored as claim.batch_id.
 */
export async function submitAhcipClaims(claims: ClaimRow[]): Promise<AhcipSubmitResult> {
  const hlink = requireHlink();
  const { claims: claimsLib, sftp: sftpLib, cfg } = hlink;
  const config = cfg.loadConfig();

  // Determine next batch number — in production this should be persisted
  // (e.g. in Supabase). For now, read from env + timestamp-based seq.
  const batchNum = parseInt(process.env.AHCIP_NEXT_BATCH ?? '570', 10);
  const prefix   = config.prefix;
  const srcCode  = config.sourceCode;

  // Build claim numbers and segments
  const txnRecords: string[] = [];
  for (let i = 0; i < claims.length; i++) {
    const seqNum     = (parseInt(process.env.AHCIP_NEXT_SEQ ?? '600', 10)) + i;
    const claimNum   = claimsLib.buildClaimNumber(prefix, srcCode, seqNum);
    const segs       = claimToHlinkSegments(claims[i], claimNum, hlink);
    txnRecords.push(...segs);
  }

  // Assemble batch
  const batchText = claimsLib.assembleBatch(prefix, batchNum, txnRecords);
  const filename  = claimsLib.batchFilename(prefix, batchNum);

  // Upload via SFTP
  const sftpClient = new sftpLib.HlinkSftp(config);
  await sftpClient.connect();
  try {
    await sftpClient.uploadBatch(filename, batchText);
  } finally {
    await sftpClient.disconnect();
  }

  return {
    batchRef:   `AHCIP-${prefix}${String(batchNum).padStart(6, '0')}`,
    batchNum,
    claimCount: claims.length,
    filename,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * List available remittance files (ARDs and batch balance reports)
 * from the Alberta Health SFTP /DOWNLOAD/ directory.
 */
export async function listAhcipRemittances(): Promise<AhcipRemittanceFile[]> {
  const { sftp: sftpLib, cfg } = requireHlink();
  const config = cfg.loadConfig();

  const sftpClient = new sftpLib.HlinkSftp(config);
  await sftpClient.connect();
  try {
    const files = await sftpClient.listDownloads() as { name: string; size: number; modifyTime: number }[];
    return files.map((f) => ({
      name:       f.name,
      size:       f.size,
      modifiedAt: new Date(f.modifyTime).toISOString(),
    }));
  } finally {
    await sftpClient.disconnect();
  }
}

/**
 * Download a specific remittance file by name.
 */
export async function downloadAhcipRemittance(filename: string): Promise<string> {
  const { sftp: sftpLib, cfg } = requireHlink();
  const config = cfg.loadConfig();

  const sftpClient = new sftpLib.HlinkSftp(config);
  await sftpClient.connect();
  try {
    const content = await sftpClient.downloadFile(filename) as string;
    return content;
  } finally {
    await sftpClient.disconnect();
  }
}

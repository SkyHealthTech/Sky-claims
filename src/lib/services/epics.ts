/**
 * src/lib/services/epics.ts
 *
 * Manitoba EPiCS (Electronic Claims Portal — Integrated Claims System) service.
 *
 * STATUS: UAT pending — waiting for Manitoba Health to issue UserSite credentials
 *         and open the UAT window. This module contains complete production-ready
 *         implementations blocked only by the credential gating.
 *
 * Architecture based on Manitoba EPiCS Technical Brief (September 2026):
 *   - REST API (not SOAP)
 *   - Auth: Auth0 client_credentials, per-UserSite API key
 *   - Batch upload: multipart POST to /eclaim/vendor/upload
 *   - Remittances: /eclaim/vendor/remittance/list → /download
 *   - File format: 80-char fixed-width, ALL CAPS, MOD-11 claim number
 *
 * Environment variables (set when UAT credentials arrive):
 *   EPICS_ENABLED        = "true"
 *   EPICS_CLIENT_ID      = Auth0 client_id (per-UserSite)
 *   EPICS_CLIENT_SECRET  = Auth0 client_secret
 *   EPICS_API_KEY        = X-API-Key header value
 *   EPICS_ENV            = "uat" | "production"
 *   EPICS_NEXT_CLAIM_NUM = last claim number used (for MOD-11 sequencing)
 */

import type { ClaimRow } from '@/lib/dal';

// ── Feature flag ─────────────────────────────────────────────────────────────

export function isEpicsEnabled(): boolean {
  return process.env.EPICS_ENABLED === 'true';
}

// ── Environment config ───────────────────────────────────────────────────────

function getEpicsConfig() {
  const env = (process.env.EPICS_ENV ?? 'uat') as 'uat' | 'production';
  const authBase = env === 'production'
    ? 'https://eclaims-mh-prod.manitobabluecross.auth0.com'
    : 'https://eclaims-mh-uat.manitobabluecross.auth0.com';
  const apiBase  = env === 'production'
    ? 'https://api.eclaims.ecserv.ca/eclaim/vendor'
    : 'https://api.eclaims.uat.ecserv.ca/eclaim/vendor';

  return {
    env,
    authBase,
    apiBase,
    clientId:     process.env.EPICS_CLIENT_ID     ?? '',
    clientSecret: process.env.EPICS_CLIENT_SECRET ?? '',
    apiKey:       process.env.EPICS_API_KEY        ?? '',
    nextClaimNum: parseInt(process.env.EPICS_NEXT_CLAIM_NUM ?? '13', 10),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type EpicsSubmitResult = {
  batchRef:   string;
  claimCount: number;
  uploadedAt: string;
  p1Base64?:  string; // validation report PDF
};

export type EpicsRemittanceFile = {
  remittanceId: string;
  period:       string;
  totalPaid:    number;
  downloadedAt: string;
};

// ── Auth0 bearer token ───────────────────────────────────────────────────────

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getBearerToken(): Promise<string> {
  const cfg = getEpicsConfig();

  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) {
    return tokenCache.token;
  }

  const res = await fetch(`${cfg.authBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:    'client_credentials',
      client_id:     cfg.clientId,
      client_secret: cfg.clientSecret,
      audience:      `${cfg.apiBase}/`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EPiCS Auth0 token error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

// ── MOD-11 claim number ──────────────────────────────────────────────────────

/**
 * Generate Manitoba EPiCS claim number with MOD-11 check digit.
 * Positions 72-79 are multiplied by primes [29,23,19,17,13,7,5,3].
 * Sum % 11 = check digit. If remainder = 10, increment and retry.
 */
function buildEpicsClaimNumber(seq: number): string {
  const PRIMES = [29, 23, 19, 17, 13, 7, 5, 3];

  let candidate = seq;
  for (let attempts = 0; attempts < 1000; attempts++) {
    const seqStr = String(candidate).padStart(8, '0');
    const digits = seqStr.split('').map(Number);
    const sum    = digits.reduce((acc, d, i) => acc + d * PRIMES[i], 0);
    const rem    = sum % 11;
    if (rem !== 10) {
      return seqStr + String(rem);
    }
    candidate++;
  }
  throw new Error('Could not generate valid EPiCS claim number');
}

// ── 80-char file builder ─────────────────────────────────────────────────────

const RECORD_LEN = 80;

function padR(s: string, len: number): string {
  return (s + ' '.repeat(len)).slice(0, len);
}
function padL(s: string, len: number, ch = ' '): string {
  return (ch.repeat(len) + s).slice(-len);
}

/**
 * Build Manitoba EPiCS 80-char fixed-width claim file.
 * Record types: 1 (batch header), 2 (claim header), 3 (service), 9 (batch trailer).
 * All fields in ALL CAPS per spec.
 */
function buildEpicsClaimFile(claims: ClaimRow[]): string {
  const cfg = getEpicsConfig();
  const now  = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  const lines: string[] = [];

  // ── Record 1: Batch Header (one per file) ─────────────────────────────────
  // Position 1: record type '1'
  // Positions 2-9: submission date YYYYMMDD
  // Positions 10-11: submission type '01' (original)
  // Positions 12-21: vendor/UserSite ID (right-justified, zero-padded)
  const userSiteId = padL(process.env.EPICS_USERSITE_ID ?? '0', 10, '0');
  const rec1 = padR('1' + date + '01' + userSiteId, RECORD_LEN).toUpperCase();
  lines.push(rec1);

  // ── Records 2+3 per claim ─────────────────────────────────────────────────
  for (let i = 0; i < claims.length; i++) {
    const claim      = claims[i];
    const claimNum   = buildEpicsClaimNumber(cfg.nextClaimNum + i);
    const feeEntry   = (claim.fee_codes as { code: string; fee: number }[])[0];
    const feeCode    = (feeEntry?.code ?? '').replace(/\./g, '').slice(0, 5).padEnd(5, ' ');
    const feeAmt     = Math.round((feeEntry?.fee ?? claim.subtotal) * 100)
                         .toString().padStart(8, '0');
    const svcDate    = (claim.service_date ?? date).replace(/-/g, '');
    const phin       = claim.health_card_no.replace(/\D/g, '').slice(0, 9).padStart(9, '0');
    const diagCode   = (claim.diagnosis_code ?? '').split(' — ')[0]
                         .replace(/\./g, '').slice(0, 5).padEnd(5, ' ').toUpperCase();

    // Record 2: Claim Header
    // Pos 1: '2', Pos 2-10: claim number (9 chars), Pos 11-19: PHIN
    // Pos 20-27: service date, Pos 28-32: fee code
    const rec2 = padR('2' + claimNum + phin + svcDate + feeCode, RECORD_LEN).toUpperCase();
    lines.push(rec2);

    // Record 3: Service detail
    // Pos 1: '3', Pos 2-9: fee amount (8 chars), Pos 10-14: dx code
    const rec3 = padR('3' + feeAmt + diagCode, RECORD_LEN).toUpperCase();
    lines.push(rec3);
  }

  // ── Record 9: Batch Trailer ───────────────────────────────────────────────
  const totalCents = Math.round(claims.reduce((s, c) => s + c.subtotal, 0) * 100)
                       .toString().padStart(12, '0');
  const claimCount = String(claims.length).padStart(6, '0');
  const rec9 = padR('9' + claimCount + totalCents, RECORD_LEN).toUpperCase();
  lines.push(rec9);

  return lines.join('\r\n') + '\r\n';
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function submitEpicsClaims(claims: ClaimRow[]): Promise<EpicsSubmitResult> {
  if (!isEpicsEnabled()) {
    throw new Error('EPiCS UAT not yet started — awaiting Manitoba Health UserSite credentials');
  }

  const cfg        = getEpicsConfig();
  const token      = await getBearerToken();
  const fileContent = buildEpicsClaimFile(claims);
  const filename   = `SKY_CLAIMS_${Date.now()}.txt`;

  // Multipart upload
  const form = new FormData();
  form.append('file', new Blob([fileContent], { type: 'text/plain' }), filename);

  const res = await fetch(`${cfg.apiBase}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-API-Key':   cfg.apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EPiCS upload error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json() as { batchId?: string; p1Report?: string };

  return {
    batchRef:   `EPICS-${data.batchId ?? Date.now()}`,
    claimCount: claims.length,
    uploadedAt: new Date().toISOString(),
    p1Base64:   data.p1Report,
  };
}

export async function listEpicsRemittances(): Promise<EpicsRemittanceFile[]> {
  if (!isEpicsEnabled()) {
    throw new Error('EPiCS UAT not yet started');
  }

  const cfg   = getEpicsConfig();
  const token = await getBearerToken();

  const res = await fetch(`${cfg.apiBase}/remittance/list`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-API-Key':   cfg.apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EPiCS remittance list error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json() as { remittances?: { id: string; period: string; totalPaid: number }[] };
  return (data.remittances ?? []).map((r) => ({
    remittanceId: r.id,
    period:       r.period,
    totalPaid:    r.totalPaid,
    downloadedAt: new Date().toISOString(),
  }));
}

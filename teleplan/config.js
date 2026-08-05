'use strict';

/**
 * teleplan/config.js
 * Loads credentials from .env and validates them.
 * Call loadConfig() at app startup — throws clearly if anything is missing.
 */

const fs   = require('fs');
const path = require('path');

/** Minimal .env loader — no external dependencies. */
function loadDotEnv() {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

const ENDPOINTS = {
  test:       'https://tlpt2.moh.hnet.bc.ca/TeleplanBroker',
  production: 'https://teleplan.hnet.bc.ca/TeleplanBroker',
};

function loadConfig() {
  const env = process.env.TELEPLAN_ENV || 'test';

  const required = {
    userId:     process.env.TELEPLAN_USER_ID,
    password:   process.env.TELEPLAN_PASSWORD,
    vendorDC:   process.env.TELEPLAN_VENDOR_DC,
    testPayee:  process.env.TELEPLAN_TEST_PAYEE,
    softwareId: process.env.TELEPLAN_SOFTWARE_ID,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(
      'Teleplan config: missing env vars: ' + missing.join(', ') + '.\n' +
      'Copy teleplan/.env.example to .env and fill in your values.'
    );
  }

  if (!ENDPOINTS[env]) {
    throw new Error('Teleplan config: unknown TELEPLAN_ENV "' + env + '". Use "test" or "production".');
  }

  // Password expiry warning (42-day cycle)
  const pwChanged = process.env.TELEPLAN_PW_CHANGED;
  if (pwChanged) {
    const daysSince = Math.floor((Date.now() - new Date(pwChanged)) / 86400000);
    if (daysSince >= 35) {
      console.warn(
        '[teleplan] WARNING: password is ' + daysSince + ' days old - expires at 42 days. ' +
        'Change it at ' + ENDPOINTS[env] + ' or via the Teleplan browser.'
      );
    }
  }

  return {
    userId:          required.userId,
    password:        required.password,
    vendorDC:        required.vendorDC,
    testPayee:       required.testPayee,
    softwareId:      required.softwareId,
    // Optional — your actual MSP practitioner billing number.
    // If not set, testPayee is used as a fallback (fine for format-compliance testing).
    // Required for category 13 (clean real-data claims with no C12 refusals).
    practitionerNum: process.env.TELEPLAN_PRACTITIONER_NUM || null,
    // Optional — your personal MSP payee (payment) number.
    // Opted-out practitioners must bill under their own payee number, not the
    // generic test payee. Falls back to practitionerNum if not separately set.
    // Set TELEPLAN_PAYEE_NUM in .env if your payee # differs from your prac #.
    payeeNum: process.env.TELEPLAN_PAYEE_NUM || process.env.TELEPLAN_PRACTITIONER_NUM || null,
    env,
    baseUrl: ENDPOINTS[env],
    isTest: env === 'test',
  };
}

module.exports = { loadConfig, ENDPOINTS };

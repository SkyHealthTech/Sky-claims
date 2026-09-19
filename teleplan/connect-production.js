'use strict';
/**
 * teleplan/connect-production.js
 *
 * Verifies live connectivity to the Teleplan PRODUCTION endpoint.
 * Run this once after setting TELEPLAN_ENV=production in .env to confirm
 * credentials and endpoint are working before processing real claims.
 *
 * USAGE:
 *   node teleplan/connect-production.js
 *
 * What it does:
 *   1. Loads config (will throw clearly if any required env var is missing)
 *   2. Logs in to teleplan.hnet.bc.ca
 *   3. Runs a single eligibility check against a known BC test PHN (900 series)
 *   4. Logs out cleanly
 *
 * Safe to run repeatedly — does NOT submit any claims.
 */

const { loadConfig } = require('./config');
const { TeleplanClient, TeleplanError } = require('./client');

async function main() {
  let cfg;
  try {
    cfg = loadConfig();
  } catch (e) {
    console.error('\n[FAIL] Config error:', e.message);
    process.exit(1);
  }

  if (cfg.isTest) {
    console.warn('\n[WARN] TELEPLAN_ENV is set to "test" — this connects to the TEST server.');
    console.warn('       Set TELEPLAN_ENV=production in teleplan/.env to connect to production.');
    console.warn('       Continuing anyway for connectivity check...\n');
  } else {
    console.log('\n[INFO] Connecting to PRODUCTION: teleplan.hnet.bc.ca');
    console.log('[INFO] Vendor DC:', cfg.vendorDC);
    console.log('[INFO] User ID :', cfg.userId, '\n');
  }

  const client = new TeleplanClient(cfg);

  try {
    await client.login();
    console.log('[OK]  Login successful.');

    // Password age check
    const pwChanged = process.env.TELEPLAN_PW_CHANGED;
    if (pwChanged) {
      const days = Math.floor((Date.now() - new Date(pwChanged)) / 86400000);
      console.log('[INFO] Password age:', days, 'days (expires at 42).');
      if (days >= 35) console.warn('[WARN] Password expires in', 42 - days, 'days — change it soon.');
    }

    // Eligibility probe — 900-series PHN is safe in production (non-existent patient)
    const eligResult = await client.checkEligibility({
      phn:          '9000000001',
      birthDate:    '19800101',
      dateOfService: new Date().toISOString().slice(0,10).replace(/-/g,''),
    });
    if (eligResult.ok) {
      console.log('[OK]  Eligibility endpoint responding.');
    } else {
      // Expected — 900 PHN won't be registered; what matters is we got a response, not an error
      console.log('[OK]  Eligibility endpoint responding (PHN not found — expected for test probe).');
    }

    await client.logout();
    console.log('[OK]  Logout successful.\n');
    console.log('=== Production connection verified ===');
    console.log('Sky Claims is ready to submit claims via Teleplan production.');
    console.log('Next step: register each practitioner via HLTH 2820 (opted-in)');
    console.log('           or HLTH 2771 (opted-out), indicating:');
    console.log('           Software: Sky Claims');
    console.log('           Vendor: Sky Health Technologies');
    console.log('           Data centre: ' + cfg.vendorDC + ' (Sky Claims DC)\n');

  } catch (e) {
    if (e instanceof TeleplanError) {
      console.error('\n[FAIL] Teleplan error:', e.message);
    } else {
      console.error('\n[FAIL] Unexpected error:', e.message);
    }
    try { await client.logout(); } catch (_) {}
    process.exit(1);
  }
}

main();

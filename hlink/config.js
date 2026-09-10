'use strict';

/**
 * hlink/config.js
 *
 * Loads AHCIP H-Link configuration from environment / .env file.
 * Mirrors the pattern used in teleplan/config.js.
 */

const path = require('path');
const fs   = require('fs');

// Load .env from this directory (hlink/.env)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function loadConfig() {
  const prefix     = process.env.AHCIP_PREFIX      || 'HZV';
  const sourceCode = process.env.AHCIP_SOURCE_CODE || 'SC';
  const env        = process.env.AHCIP_ENV         || 'test';

  const sftp = {
    host:           process.env.AHCIP_SFTP_HOST || 'getfile.health.alberta.ca',
    port:           parseInt(process.env.AHCIP_SFTP_PORT || '22', 10),
    username:       process.env.AHCIP_SFTP_USER || 'HZVa',
    password:       process.env.AHCIP_SFTP_PASSWORD || '',
    privateKeyPath: process.env.AHCIP_PRIVATE_KEY_PATH || '',
  };

  const startingBatch = parseInt(process.env.AHCIP_STARTING_BATCH || '530', 10);

  return {
    prefix,
    sourceCode,
    env,
    isTest: env !== 'production',
    sftp,
    startingBatch,
  };
}

module.exports = { loadConfig };

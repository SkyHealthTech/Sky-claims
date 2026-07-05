'use strict';

/**
 * teleplan/index.js
 *
 * Sky Claims — Teleplan module public API.
 *
 * Usage:
 *   const teleplan = require('./teleplan');
 *   await teleplan.init();  // loads + validates credentials from .env
 *
 *   // Real-time eligibility (point-of-service only — not for batch / scheduled patients)
 *   const result = await teleplan.checkEligibility({ phn, birthDate });
 *
 *   // Submit claims
 *   const sendResult = await teleplan.submitClaims(claimsArray);
 *
 *   // Retrieve remittances and refusals
 *   const bundle = await teleplan.retrieveAndParse();
 */

const { loadConfig }          = require('./config');
const { TeleplanClient }      = require('./client');
const { EligibilityService }  = require('./eligibility');
const { buildSubmissionFile } = require('./claims');
const { parseRemittanceBundle, reconcile } = require('./parser');

let _config = null;
let _client = null;
let _eligibility = null;

/**
 * Initialize the Teleplan module.
 * Call once at app startup (after dotenv is loaded).
 * Throws clearly if any required env var is missing.
 */
function init() {
  _config     = loadConfig();
  _client     = new TeleplanClient(_config);
  _eligibility = new EligibilityService(_client);

  console.log(
    `[teleplan] Initialized. Vendor DC: ${_config.vendorDC} | ` +
    `Env: ${_config.env} | ` +
    `Endpoint: ${_config.baseUrl}`
  );
}

function _requireInit() {
  if (!_client) throw new Error('teleplan.init() must be called before using the module.');
}

/**
 * Real-time eligibility check (AcheckE45).
 * Point-of-service only — do not batch.
 *
 * @param {object} params  { phn, birthDate, dateOfService?, checkSubsidy?, checkEyeExam? }
 * @returns {Promise<import('./eligibility').EligibilityResult>}
 */
async function checkEligibility(params) {
  _requireInit();
  return _eligibility.check(params);
}

/**
 * Submit an array of claim objects to Teleplan.
 *
 * @param {object[]} claims  Array of claim objects with `type` field
 * @returns {Promise<object>}  { ok, httpStatus, messages, raw }
 */
async function submitClaims(claims) {
  _requireInit();
  const fileText = buildSubmissionFile(_config, claims);
  return _client.sendClaims(fileText);
}

/**
 * Retrieve remittances and parse them into a typed bundle.
 *
 * @returns {Promise<import('./parser').RemittanceBundle>}
 */
async function retrieveAndParse() {
  _requireInit();
  const raw = await _client.retrieveRemittances();
  return parseRemittanceBundle(raw.raw);
}

/**
 * Convenience: retrieve, parse, and reconcile against previously submitted claims.
 *
 * @param {object[]} submittedClaims  Claims that were sent (must have sequenceNumber)
 * @returns {Promise<import('./parser').ReconciliationReport>}
 */
async function retrieveAndReconcile(submittedClaims) {
  const bundle = await retrieveAndParse();
  return reconcile(bundle, submittedClaims);
}

module.exports = {
  init,
  checkEligibility,
  submitClaims,
  retrieveAndParse,
  retrieveAndReconcile,
  // Expose internals for advanced use / testing
  get config()     { return _config; },
  get client()     { return _client; },
};

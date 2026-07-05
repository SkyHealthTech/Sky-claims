'use strict';

/**
 * teleplan/test-fixtures.js
 *
 * Official HIBC test PHNs from "04 Vendor Check Eligibility Test Data.doc"
 * (kit v4.6, last updated August 21 2024).
 *
 * Each fixture is the complete expected response so the conformance harness
 * can do a full assertion — not just "did it succeed" but "did it return
 * the right name, eligibility status, subsidy count, and eye exam date".
 *
 * NOTE: The kit says "results may differ at time of vendor test due to aging
 * of data." Treat coverage status and eye exam dates as soft assertions;
 * hard-assert on PHN, name, birth date, and gender.
 */

const ELIGIBILITY_FIXTURES = [
  {
    id: 1,
    input: {
      phn:           '9151210417',
      birthDate:     '19591128',
      checkSubsidy:  true,
      checkEyeExam:  true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'BURNHAM RICHARD GERD',
      birthDate:         '19591128',
      gender:            'MALE',
      eligibleOnDate:    true,
      coverageEndDate:   null,
      coverageEndReason: null,
      subsidyPaidToDate: 0,
      eyeExamDate:       '2024-01-01',
    },
  },
  {
    id: 2,
    input: {
      phn:          '9151065434',
      birthDate:    '19591225',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:        'HJMB001I',
      name:               'BURROWS CHRISTINE JOSEPHINE',
      birthDate:          '19591225',
      gender:             'FEMALE',
      eligibleOnDate:     true,
      coverageEndDate:    null,
      coverageEndReason:  null,
      subsidyNotInsured:  true,
      eyeExamDate:        '2024-01-01',
    },
  },
  {
    id: 3,
    input: {
      phn:          '9151242549',
      birthDate:    '19880414',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'MERCER AUSTIN CHARLES',
      birthDate:         '19880414',
      gender:            'MALE',
      eligibleOnDate:    true,
      coverageEndDate:   null,
      coverageEndReason: null,
      subsidyNotInsured: true,
      eyeExamDate:       '2024-01-01',
    },
  },
  {
    id: 4,
    note: 'Submit with birth day "00" as an alternate test',
    input: {
      phn:          '9151071072',
      birthDate:    '19410404',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'MATTE GERALD FREDRICK',
      birthDate:         '19410404',
      gender:            'MALE',
      eligibleOnDate:    true,
      coverageEndDate:   null,
      coverageEndReason: null,
      subsidyNotInsured: true,
      eyeExamNoPayment:  true,  // MSP HAS NOT PAID FOR AN EYE EXAM IN LAST 24 MTHS
    },
  },
  {
    id: 5,
    input: {
      phn:          '9151274799',
      birthDate:    '19930407',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'ABRAHAM MAXIMILIAN FERDINAND',
      birthDate:         '19930407',
      gender:            'MALE',
      eligibleOnDate:    true,
      coverageEndDate:   null,
      coverageEndReason: null,
      subsidyNotInsured: true,
      eyeExamNoPayment:  true,
    },
  },
  {
    id: 6,
    note: 'Ineligible — no contact with MSP',
    input: {
      phn:          '9151206012',
      birthDate:    '19570705',
      checkSubsidy: false,
      checkEyeExam: false,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'VAILLANCOURT SHELLY ANNE',
      birthDate:         '19570705',
      gender:            'FEMALE',
      eligibleOnDate:    false,
      coverageEndDate:   '19971130',
      coverageEndReason: 'NO CONTACT WITH MSP',
    },
  },
  {
    id: 7,
    note: 'Eligible — confirm identity (duplicate card request)',
    input: {
      phn:          '9151259051',
      birthDate:    '19901022',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'WICKS ASHLEE NADINE',
      birthDate:         '19901022',
      gender:            'FEMALE',
      eligibleOnDate:    true,
      coverageEndDate:   null,
      coverageEndReason: null,
      subsidyNotInsured: true,
      eyeExamNoPayment:  true,
      clientInstruction: true,   // PLEASE ENSURE YOU CONFIRM THE IDENTITY
    },
  },
  {
    id: 8,
    note: 'Eligible — duplicate CareCard, subsidy paid=0',
    input: {
      phn:          '9151252098',
      birthDate:    '19611119',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'BUTLER SHELLY DOLLY',
      birthDate:         '19611119',
      gender:            'FEMALE',
      eligibleOnDate:    true,
      subsidyPaidToDate: 0,
      eyeExamNoPayment:  true,
      clientInstruction: true,   // DUPLICATE CARECARD
    },
  },
  {
    id: 9,
    input: {
      phn:          '9151237142',
      birthDate:    '19560314',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'DALEY LISA CHARLOTTE',
      birthDate:         '19560314',
      gender:            'FEMALE',
      eligibleOnDate:    true,
      subsidyPaidToDate: 0,
      eyeExamNoPayment:  true,
    },
  },
  {
    id: 10,
    note: 'Merged PHN — response returns the new canonical PHN',
    input: {
      phn:          '9151247483',  // old / merged
      birthDate:    '19741002',
      checkSubsidy: false,
      checkEyeExam: false,
    },
    expected: {
      warningCode:       'HNHR511W',  // IPUT PHN WAS MERGED
      resolvedPhn:       '9151247509',
      name:              'WHALEN MELISSA GIRARD',
      birthDate:         '19741002',
      gender:            'FEMALE',
      eligibleOnDate:    false,
      coverageEndDate:   '19921130',
      coverageEndReason: 'NO CONTACT WITH MSP',
    },
  },
  {
    id: 11,
    note: 'Ineligible — Canadian Armed Forces exclusion',
    input: {
      phn:          '9151059258',
      birthDate:    '19590601',
      checkSubsidy: false,
      checkEyeExam: false,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'BLAND B H',
      birthDate:         '19590601',
      gender:            'MALE',
      eligibleOnDate:    false,
      coverageEndReason: 'EXCLUDED - ARMED FORCES',
    },
  },
  {
    id: 12,
    note: 'Ineligible — moved out of province',
    input: {
      phn:          '9151234921',
      birthDate:    '19860815',
      checkSubsidy: false,
      checkEyeExam: false,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'HUMPHREY SANDI D',
      birthDate:         '19860815',
      gender:            'UNKNOWN',
      eligibleOnDate:    false,
      coverageEndDate:   '19930831',
      coverageEndReason: 'OUT OF PROVINCE MOVE',
    },
  },
  {
    id: 13,
    note: 'Ineligible — deceased',
    input: {
      phn:          '9151040354',
      birthDate:    '19241205',
      checkSubsidy: false,
      checkEyeExam: false,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'TENNANT ADELIA',
      birthDate:         '19241205',
      gender:            'FEMALE',
      eligibleOnDate:    false,
      coverageEndDate:   '19910331',
      coverageEndReason: 'DECEASED',
    },
  },
  {
    id: 14,
    note: 'Eligible — replacement BC Services Card',
    input: {
      phn:          '9151058034',
      birthDate:    '19671101',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'ROLLINS MICHELE LOUISE',
      birthDate:         '19671101',
      gender:            'FEMALE',
      eligibleOnDate:    true,
      subsidyPaidToDate: 0,  // live test-env returns 0; spec doc said 8 (may vary)
      eyeExamNoPayment:  true,
      clientInstruction: true,  // REPLACEMENT BC SERVICES CARD
    },
  },
  {
    id: 15,
    input: {
      phn:          '9151285863',
      birthDate:    '19970228',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'ROLLINS JADEN DANIEL',
      birthDate:         '19970228',
      gender:            'MALE',
      eligibleOnDate:    true,
      subsidyPaidToDate: 1,
      eyeExamNoPayment:  true,
    },
  },
  {
    id: 16,
    input: {
      phn:          '9151261721',
      birthDate:    '19670529',
      checkSubsidy: true,
      checkEyeExam: true,
    },
    expected: {
      successCode:       'HJMB001I',
      name:              'JACK AVA VALERIE',
      birthDate:         '19670529',
      gender:            'FEMALE',
      eligibleOnDate:    true,
      subsidyPaidToDate: 0,
      eyeExamDate:       '2024-01-01',
    },
  },
];

module.exports = { ELIGIBILITY_FIXTURES };

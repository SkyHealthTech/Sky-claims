'use strict';
/**
 * hlink/dump-xlsx.js
 *
 * Reads the AHCIP checklist xlsx and dumps every row as JSON so we can
 * see the exact column structure before writing the update script.
 *
 * FIRST RUN (one time):
 *   cd hlink && npm install xlsx
 *
 * THEN:
 *   node hlink/dump-xlsx.js
 */

const XLSX = require('xlsx');
const path = require('path');

const xlsxPath = path.join(__dirname, '..', 'AHCIP H-Link Conformance Checklist - Round 2 Complete.xlsx');

const wb = XLSX.readFile(xlsxPath);
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(function(name) {
  console.log('\n=== Sheet: ' + name + ' ===');
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z50');
  console.log('Range:', ws['!ref']);

  // Print column headers (row 1)
  const headers = [];
  for (let C = range.s.c; C <= Math.min(range.e.c, 20); C++) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
    const cell = ws[addr];
    headers.push(cell ? String(cell.v).substring(0, 40) : '(empty)');
  }
  console.log('Headers:', JSON.stringify(headers, null, 2));

  // Print all rows
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  rows.forEach(function(row, i) {
    console.log('Row ' + (i + 1) + ':', JSON.stringify(row));
  });
});

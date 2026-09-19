'use strict';
/**
 * hlink/dump-template.js
 * Dumps the AHCIP-supplied template xlsx so we can map its exact structure.
 *
 * USAGE:
 *   node hlink/dump-template.js
 */

const XLSX = require('xlsx');
const path = require('path');

const SRC = path.join(__dirname, '..', 'AHCIP_template_round2.xlsx');

const wb = XLSX.readFile(SRC);
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(function(name) {
  const ws = wb.Sheets[name];
  console.log('\n=== Sheet: "' + name + '" ===');
  console.log('Range:', ws['!ref']);

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z50');

  // Print every non-empty cell with its address and value
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && cell.v !== undefined && String(cell.v).trim() !== '') {
        console.log('  ' + addr + ' (r=' + R + ',c=' + C + '): ' + JSON.stringify(String(cell.v).substring(0, 120)));
      }
    }
  }
});

#!/usr/bin/env node

/**
 * Get Test Status
 * Reads test-matrix-summary.json and outputs test status (passed/failed)
 */

const fs = require('fs');

if (!fs.existsSync('test-matrix-summary.json')) {
  console.log('unknown');
  process.exit(0);
}

try {
  const data = JSON.parse(fs.readFileSync('test-matrix-summary.json', 'utf-8'));
  const status = data.total_failed > 0 ? 'failed' : 'passed';
  console.log(status);
} catch (e) {
  console.log('unknown');
  process.exit(1);
}

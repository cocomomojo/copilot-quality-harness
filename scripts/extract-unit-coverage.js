#!/usr/bin/env node

const fs = require('fs');

const coveragePath = process.argv[2] || './coverage/coverage-final.json';

function writeCoverageResult(value) {
  console.log(`COVERAGE_PCT=${value}`);
}

if (!fs.existsSync(coveragePath)) {
  writeCoverageResult(0);
  process.exit(0);
}

try {
  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
  const coverageEntries = Object.values(coverage || {});
  const total = coverageEntries.length;
  const lines = coverageEntries.map((entry) => entry && entry.s).filter(Boolean).length;
  const pct = total > 0 ? Math.round((lines / total) * 100) : 0;
  writeCoverageResult(pct);
} catch (error) {
  writeCoverageResult(0);
  process.exit(0);
}

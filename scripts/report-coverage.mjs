#!/usr/bin/env node
/**
 * Print the aggregated (frontend + backend) line coverage used as the dashboard KPI.
 * Run after `pnpm test` (vitest run --coverage) has produced frontend/backend coverage reports.
 */
import { aggregateCoverageFiles, findCoverageFiles } from './lib/coverage.mjs';

const files = ['backend/coverage', 'frontend/coverage'].flatMap((dir) => findCoverageFiles(dir));
const result = aggregateCoverageFiles(files);

if (!result) {
  console.log('No coverage reports found. Run `pnpm test` first.');
  process.exit(1);
}

for (const pkg of result.packages) {
  console.log(`${pkg.file}: ${pkg.covered}/${pkg.total} lines (${pkg.pct}%)`);
}
console.log(`Aggregated line coverage (dashboard KPI): ${result.coverage}% (${result.covered}/${result.total})`);

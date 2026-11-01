#!/usr/bin/env node

/**
 * Verify Test Matrix Completeness
 * Checks that test-matrix-summary.json contains all required test types
 */

const fs = require('fs');

if (!fs.existsSync('test-matrix-summary.json')) {
  console.error('❌ ERROR: test-matrix-summary.json not found');
  process.exit(1);
}

try {
  const summary = JSON.parse(fs.readFileSync('test-matrix-summary.json', 'utf-8'));

  console.log('📊 Test Matrix Status:');
  console.log('  Total combinations:', summary.total_combinations);
  console.log('  Total tests:', summary.total_tests);
  console.log('  Expected test types: 4 (unit, api, e2e, advanced)');
  console.log('  Found test types:', summary.completeness_check.found_test_types.length);

  const hasAllTypes = summary.completeness_check.missing_test_types.length === 0;
  const hasTests = summary.total_tests > 0;

  if (!hasAllTypes) {
    console.warn('\n⚠️  WARNING: Incomplete test matrix');
    console.warn('  Missing test types:', summary.completeness_check.missing_test_types.join(', '));
    process.exit(1);
  }

  if (!hasTests) {
    console.warn('\n⚠️  WARNING: No tests were executed');
    process.exit(1);
  }

  console.log('\n✅ Test matrix is complete and valid');
} catch (e) {
  console.error('❌ ERROR parsing test-matrix-summary.json:', e.message);
  process.exit(1);
}

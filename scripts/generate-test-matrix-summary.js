#!/usr/bin/env node

/**
 * Generate Test Matrix Summary
 * Collects all test results and generates a summary with completeness check
 */

const fs = require('fs');
const path = require('path');

const resultsDir = 'test-results-all';
const allResults = [];
const expectedTestTypes = ['unit', 'api', 'e2e', 'advanced'];

console.log('📂 Reading test results from:', resultsDir);
if (!fs.existsSync(resultsDir)) {
  console.error('❌ ERROR: Directory not found:', resultsDir);
  process.exit(1);
}

const dirs = fs.readdirSync(resultsDir);
console.log('Found result directories:', JSON.stringify(dirs));
console.log('Number of directories:', dirs.length);

// List full directory structure for debugging
console.log('\n📊 Full directory structure:');
const walkDir = (currentPath, indent = '') => {
  const files = fs.readdirSync(currentPath);
  files.forEach(file => {
    const fullPath = path.join(currentPath, file);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      console.log(indent + '📁 ' + file);
      walkDir(fullPath, indent + '  ');
    } else {
      console.log(indent + '📄 ' + file + ' (' + stats.size + ' bytes)');
    }
  });
};
walkDir(resultsDir);

// Collect all test results
for (const dir of dirs) {
  const dirPath = path.join(resultsDir, dir);
  console.log('\n  📂 Processing directory:', dir);
  
  // Skip non-test-result directories
  if (!dir.startsWith('test-results-node-')) {
    console.log('    ⏭️  Skipping non-test-result directory');
    continue;
  }
  
  try {
    const files = fs.readdirSync(dirPath);
    console.log('    Files found:', files);
    
    const jsonFile = files.find(f => f.endsWith('.json'));
    if (!jsonFile) {
      console.error('    ❌ No JSON file found in this directory');
      continue;
    }
    
    const jsonPath = path.join(dirPath, jsonFile);
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    console.log('    File size:', rawData.length, 'bytes');
    
    const data = JSON.parse(rawData);
    console.log('    ✓ Parsed:', { test_type: data.test_type, node_version: data.node_version, passed: data.passed, failed: data.failed, status: data.status });
    allResults.push(data);
  } catch (e) {
    console.error('    ❌ Error:', e.message);
  }
}

console.log('\n📊 ==================== SUMMARY ====================');
console.log('Total results collected:', allResults.length);
console.log('Expected test types:', expectedTestTypes);

// Check test type coverage
const foundTestTypes = new Set(allResults.map(r => r.test_type));
const missingTestTypes = expectedTestTypes.filter(t => !foundTestTypes.has(t));

if (missingTestTypes.length > 0) {
  console.warn('⚠️  WARNING: Missing test types:', missingTestTypes);
  console.warn('  Found test types:', Array.from(foundTestTypes));
} else {
  console.log('✅ All expected test types found:', Array.from(foundTestTypes).sort());
}

console.log('\nResults by test type:');
allResults.forEach(r => {
  console.log('  -', r.test_type, '| passed:', r.passed, '| failed:', r.failed, '| status:', r.status);
});

// Generate summary
const summary = {
  timestamp: new Date().toISOString(),
  total_combinations: allResults.length,
  passed_combinations: allResults.filter(r => r.status === 'passed').length,
  failed_combinations: allResults.filter(r => r.status === 'failed').length,
  total_tests: allResults.reduce((sum, r) => sum + (r.passed || 0) + (r.failed || 0), 0),
  total_passed: allResults.reduce((sum, r) => sum + (r.passed || 0), 0),
  total_failed: allResults.reduce((sum, r) => sum + (r.failed || 0), 0),
  by_node_version: {},
  by_test_type: {},
  completeness_check: {
    expected_test_types: expectedTestTypes,
    found_test_types: Array.from(foundTestTypes).sort(),
    missing_test_types: missingTestTypes
  }
};

// Validate total_tests is reasonable
if (summary.total_tests === 0 && allResults.length > 0) {
  console.warn('⚠️  WARNING: total_tests is 0 but results exist - this indicates a problem with test result collection');
}

// Group by node version
for (const version of [20]) {
  const versionResults = allResults.filter(r => r.node_version === version);
  summary.by_node_version[version] = {
    passed_tests: versionResults.reduce((sum, r) => sum + (r.passed || 0), 0),
    failed_tests: versionResults.reduce((sum, r) => sum + (r.failed || 0), 0),
    status: versionResults.every(r => r.status === 'passed') ? 'all_passed' : 'some_failed'
  };
}

// Group by test type
for (const type of ['unit', 'api', 'e2e', 'advanced']) {
  const typeResults = allResults.filter(r => r.test_type === type);
  summary.by_test_type[type] = {
    passed_tests: typeResults.reduce((sum, r) => sum + (r.passed || 0), 0),
    failed_tests: typeResults.reduce((sum, r) => sum + (r.failed || 0), 0),
    combinations: typeResults.length,
    status: typeResults.length > 0 && typeResults.every(r => r.status === 'passed') ? 'all_passed' : (typeResults.length === 0 ? 'missing' : 'some_failed')
  };
}

console.log('\n✅ ==================== FINAL TEST MATRIX SUMMARY ====================');
console.log('Total test combinations executed:', summary.total_combinations);
console.log('Total tests run:', summary.total_tests);
console.log('Total passed:', summary.total_passed);
console.log('Total failed:', summary.total_failed);
console.log('');
console.log('By Test Type:');
Object.entries(summary.by_test_type).forEach(([type, stats]) => {
  const icon = stats.status === 'missing' ? '❌' : (stats.status === 'all_passed' ? '✅' : '⚠️');
  console.log('  ' + icon + ' ' + type + ': ' + stats.passed_tests + ' passed, ' + stats.failed_tests + ' failed (' + stats.combinations + ' combo)');
});
console.log('');
console.log('Completeness Check:');
console.log('  Expected test types:', summary.completeness_check.expected_test_types.join(', '));
console.log('  Found test types:', summary.completeness_check.found_test_types.join(', '));
if (summary.completeness_check.missing_test_types.length > 0) {
  console.log('  ❌ MISSING:', summary.completeness_check.missing_test_types.join(', '));
} else {
  console.log('  ✅ All test types present');
}
console.log('');
console.log('Full Summary:');
console.log(JSON.stringify(summary, null, 2));

fs.writeFileSync('test-matrix-summary.json', JSON.stringify(summary, null, 2));
console.log('\n✅ Summary saved to test-matrix-summary.json');

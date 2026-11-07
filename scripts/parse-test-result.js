#!/usr/bin/env node

/**
 * Parse test results from log file
 * Supports: Vitest, Mocha, Node test runner, Playwright
 */

const fs = require('fs');
const path = require('path');

const nodeVersion = process.argv[2] || '20';
const testType = process.argv[3] || 'unit';
const logFile = `/tmp/test-result-${nodeVersion}-${testType}.log`;

let result = {
  test_type: testType,
  node_version: parseInt(nodeVersion),
  status: 'unknown',
  passed: 0,
  failed: 0,
  skipped: 0,
  timestamp: new Date().toISOString()
};

console.log(`📖 Reading test log: ${logFile}`);

if (!fs.existsSync(logFile)) {
  console.error(`❌ Log file not found: ${logFile}`);
  result.status = 'error';
  fs.writeFileSync(`test-result-${nodeVersion}-${testType}.json`, JSON.stringify(result, null, 2));
  process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf-8');
const lines = content.split('\n');

console.log(`📏 Log file size: ${content.length} bytes, ${lines.length} lines`);

// Try different pattern matching strategies

// **Strategy 1: Vitest format** - "Tests  53 passed (53)"
const vitestTests = content.match(/Tests\s+(\d+)\s+passed/);
if (vitestTests) {
  result.passed = parseInt(vitestTests[1]);
  console.log(`✓ Vitest format detected: ${result.passed} tests passed`);
}

// **Strategy 2: Look for "failed" keyword**
const vitestFailed = content.match(/Tests\s+(\d+)\s+failed/);
if (vitestFailed) {
  result.failed = parseInt(vitestFailed[1]);
  console.log(`✓ Failed tests found: ${result.failed}`);
}

// **Strategy 3: For E2E (Playwright) - "N passed, M failed"**
if (testType === 'e2e') {
  const pwFormat = content.match(/(\d+)\s+passed/);
  if (pwFormat) {
    result.passed = parseInt(pwFormat[1]);
    console.log(`✓ Playwright passed format: ${result.passed}`);
  }
  
  const pwFailed = content.match(/(\d+)\s+failed/);
  if (pwFailed) {
    result.failed = parseInt(pwFailed[1]);
    console.log(`✓ Playwright failed format: ${result.failed}`);
  }
}

// **Strategy 4: Fallback - look for test summary patterns**
// Vitest can also output like: "test 1: ✓" "test 2: ✗"
const allPassed = (content.match(/✓/g) || []).length;
const allFailed = (content.match(/✗/g) || []).length;

if (result.passed === 0 && result.failed === 0) {
  console.log(`📊 No clear test counts found. Attempting character-based detection...`);
  console.log(`   Found ${allPassed} checkmarks (✓), ${allFailed} X marks (✗)`);
  
  if (allPassed > 0 || allFailed > 0) {
    // This is very rough but better than 0/0
    result.passed = allPassed;
    result.failed = allFailed;
  }
}

// **Strategy 5: Mocha/Node format**
const mochaPass = content.match(/(\d+)\s+passing/);
if (mochaPass && result.passed === 0) {
  result.passed = parseInt(mochaPass[1]);
  console.log(`✓ Mocha "passing" format: ${result.passed}`);
}

const mochaFail = content.match(/(\d+)\s+failing/);
if (mochaFail) {
  result.failed = parseInt(mochaFail[1]);
  console.log(`✓ Mocha "failing" format: ${result.failed}`);
}

// Determine overall status
result.status = result.failed === 0 && result.passed > 0 ? 'passed' : result.failed > 0 ? 'failed' : 'error';

console.log(`\n📊 Final result: { test_type: '${result.test_type}', passed: ${result.passed}, failed: ${result.failed}, status: '${result.status}' }`);

// Write JSON result
const jsonFile = `test-result-${nodeVersion}-${testType}.json`;
fs.writeFileSync(jsonFile, JSON.stringify(result, null, 2));
console.log(`✅ Result written to: ${jsonFile}`);

// Also set GitHub Actions output
if (process.env.GITHUB_OUTPUT) {
  const output = `status=${result.status}
passed=${result.passed}
failed=${result.failed}
skipped=${result.skipped}
`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log(`✅ GitHub Actions output set`);
}

process.exit(result.status === 'error' ? 1 : 0);

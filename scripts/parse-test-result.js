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
  console.error(`\n📂 Contents of /tmp/:`);
  try {
    const tmpFiles = require('child_process').execSync('ls -lah /tmp/test-result* 2>/dev/null || true').toString();
    console.error(tmpFiles);
  } catch (e) {}
  process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf-8');
const lines = content.split('\n');

console.log(`📏 Log file size: ${content.length} bytes, ${lines.length} lines`);
console.log(`📋 Log file excerpt (first 300 chars):`);
console.log(content.substring(0, 300));
console.log('...\n');

// Try different pattern matching strategies

// **Strategy 1: Vitest format** - "Tests  53 passed (53)" or "Tests  53 passed"
let vitestTests = content.match(/Tests\s+(\d+)\s+passed/);
if (vitestTests) {
  result.passed = parseInt(vitestTests[1]);
  console.log(`✓ Vitest "Tests N passed" format detected: ${result.passed} tests passed`);
}

// **Strategy 2: Look for "failed" in Vitest format - "Tests  2 failed"**
let vitestFailed = content.match(/Tests\s+(\d+)\s+failed/);
if (vitestFailed) {
  result.failed = parseInt(vitestFailed[1]);
  console.log(`✓ Vitest "Tests N failed" format detected: ${result.failed}`);
}

// **Strategy 3: For E2E (Playwright) - "N passed, M failed"**
if (testType === 'e2e') {
  // Playwright format: "1 passed (1)"
  const pwFormat = content.match(/(\d+)\s+passed/);
  if (pwFormat && result.passed === 0) {
    result.passed = parseInt(pwFormat[1]);
    console.log(`✓ Playwright "N passed" format: ${result.passed}`);
  }
  
  const pwFailed = content.match(/(\d+)\s+failed/);
  if (pwFailed && result.failed === 0) {
    result.failed = parseInt(pwFailed[1]);
    console.log(`✓ Playwright "N failed" format: ${result.failed}`);
  }
}

// **Strategy 4: Mocha/Node format** - "123 passing" / "2 failing"
const mochaPass = content.match(/(\d+)\s+passing/);
if (mochaPass && result.passed === 0) {
  result.passed = parseInt(mochaPass[1]);
  console.log(`✓ Mocha "N passing" format: ${result.passed}`);
}

const mochaFail = content.match(/(\d+)\s+failing/);
if (mochaFail && result.failed === 0) {
  result.failed = parseInt(mochaFail[1]);
  console.log(`✓ Mocha "N failing" format: ${result.failed}`);
}

// **Strategy 5: Fallback - count unicode checkmarks/X marks**
if (result.passed === 0 && result.failed === 0) {
  const allPassed = (content.match(/✓/g) || []).length;
  const allFailed = (content.match(/✗/g) || []).length;
  
  if (allPassed > 0 || allFailed > 0) {
    console.log(`📊 No explicit counts found. Using unicode symbol counts...`);
    console.log(`   Found ${allPassed} checkmarks (✓), ${allFailed} X marks (✗)`);
    result.passed = allPassed;
    result.failed = allFailed;
  }
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

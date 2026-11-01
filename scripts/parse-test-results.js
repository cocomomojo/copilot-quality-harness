#!/usr/bin/env node

const fs = require('fs');

const logPath = process.argv[2];
const testType = process.argv[3] || 'unknown';
const outputPath = process.env.OUTPUT_FILE
  ? (process.env.OUTPUT_FILE.endsWith('.json') ? process.env.OUTPUT_FILE : `${process.env.OUTPUT_FILE}.json`)
  : 'test-result.json';

function writeResult(result) {
  fs.writeFileSync(outputPath, JSON.stringify(result));
  if (process.env.GITHUB_OUTPUT) {
    const output = `status=${result.status}\npassed=${result.passed}\nfailed=${result.failed}\n`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  }
  console.log('Test Results:', JSON.stringify(result));
}

if (!logPath || !fs.existsSync(logPath)) {
  const result = {
    test_type: testType,
    node_version: process.env.NODE_VERSION || 'unknown',
    status: 'error',
    passed: 0,
    failed: 0,
    skipped: 0,
    timestamp: new Date().toISOString()
  };
  writeResult(result);
  process.exit(0);
}

const content = fs.readFileSync(logPath, 'utf-8');
const result = {
  test_type: testType,
  node_version: process.env.NODE_VERSION || 'unknown',
  status: 'unknown',
  passed: 0,
  failed: 0,
  skipped: 0,
  timestamp: new Date().toISOString()
};

const vitestPass = content.match(/✓\s+(\d+)\s+passed/);
const vitestFail = content.match(/✖\s+(\d+)\s+failed/);
const vitestSkip = content.match(/⊘\s+(\d+)\s+skipped/);
const mochaPass = content.match(/(\d+)\s+passing/);
const mochaFail = content.match(/(\d+)\s+failing/);
const mochaSkip = content.match(/(\d+)\s+pending/);

result.passed = vitestPass ? Number(vitestPass[1]) : (mochaPass ? Number(mochaPass[1]) : 0);
result.failed = vitestFail ? Number(vitestFail[1]) : (mochaFail ? Number(mochaFail[1]) : 0);
result.skipped = vitestSkip ? Number(vitestSkip[1]) : (mochaSkip ? Number(mochaSkip[1]) : 0);

if (testType === 'e2e') {
  const pwPass = content.match(/(\d+)\s+passed/);
  const pwFail = content.match(/(\d+)\s+failed/);
  result.passed = pwPass ? Number(pwPass[1]) : 0;
  result.failed = pwFail ? Number(pwFail[1]) : 0;
}

if (result.failed === 0 && (result.passed > 0 || ['api', 'unit', 'advanced'].includes(testType))) {
  result.status = 'passed';
} else if (result.failed > 0) {
  result.status = 'failed';
} else {
  result.status = 'error';
}

writeResult(result);

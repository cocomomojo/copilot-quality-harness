import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();

test('extract-unit-coverage.js writes a numeric coverage percentage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'coverage-script-'));
  try {
    const coveragePath = join(dir, 'coverage-final.json');
    writeFileSync(coveragePath, JSON.stringify({ a: { s: [1, 2, 3] }, b: { s: [1, 2] }, c: { s: null } }));

    const result = execFileSync(process.execPath, [join(root, 'scripts/extract-unit-coverage.js'), coveragePath], { encoding: 'utf8' });
    assert.match(result.trim(), /^COVERAGE_PCT=67$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parse-test-results.js produces the expected result JSON and GITHUB_OUTPUT', () => {
  const dir = mkdtempSync(join(tmpdir(), 'parse-script-'));
  try {
    const logPath = join(dir, 'result.log');
    const outputFile = join(dir, 'output-result');
    const githubOutput = join(dir, 'github-output.txt');
    writeFileSync(logPath, '✓ 10 passed\n✖ 2 failed\n');

    const env = { ...process.env, NODE_VERSION: '20', OUTPUT_FILE: outputFile, GITHUB_OUTPUT: githubOutput };
    const result = execFileSync(process.execPath, [join(root, 'scripts/parse-test-results.js'), logPath, 'unit'], { encoding: 'utf8', env });

    assert.match(result, /"status":"failed"/);
    assert.match(readFileSync(githubOutput, 'utf8'), /status=failed\npassed=10\nfailed=2/);
    const parsed = JSON.parse(readFileSync(`${outputFile}.json`, 'utf8'));
    assert.equal(parsed.test_type, 'unit');
    assert.equal(parsed.node_version, '20');
    assert.equal(parsed.passed, 10);
    assert.equal(parsed.failed, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

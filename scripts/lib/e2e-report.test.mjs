// Regression test: each E2E test must link to its own trace (all traces are named trace.zip).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runnerRoot = '/home/runner/work/copilot-quality-harness/copilot-quality-harness/test-results';
const testDirs = {
  'E2E-406 complete todo from UI': 'ui-flow-Web-UI-flows-E2E-4-1a2b3-complete-todo-from-UI',
  'E2E-407 delete todo from UI and remove it': 'ui-flow-Web-UI-flows-E2E-4-4b652--todo-from-UI-and-remove-it',
};

const sha1 = (value) => createHash('sha1').update(value).digest('hex');

test('trace links resolve to the published copy of each test\'s own trace', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'e2e-report-'));
  const artifactDir = join(cwd, 'artifacts/e2e-test-results-node-20');
  for (const dir of Object.values(testDirs)) {
    mkdirSync(join(artifactDir, dir), { recursive: true });
    writeFileSync(join(artifactDir, dir, 'trace.zip'), dir);
  }
  const specs = Object.entries(testDirs).map(([title, dir]) => ({
    title,
    tests: [{
      results: [{
        status: 'passed',
        duration: 1,
        attachments: [{ name: 'trace', contentType: 'application/zip', path: `${runnerRoot}/${dir}/trace.zip` }],
      }],
    }],
  }));
  writeFileSync(join(artifactDir, 'summary.json'), JSON.stringify({
    suites: [{ title: 'ui-flow.spec.js', file: 'ui-flow.spec.js', specs: [], suites: [{ title: 'Web UI flows', specs }] }],
  }));

  execFileSync(join(repoRoot, 'node_modules/.bin/ts-node'), [join(repoRoot, 'scripts/generate-e2e-report.ts'), 'out'], {
    cwd,
    env: { ...process.env, TS_NODE_PROJECT: join(repoRoot, 'tsconfig.json') },
    stdio: 'pipe',
  });

  const report = JSON.parse(readFileSync(join(cwd, 'out/test-cases.json'), 'utf-8'));
  const tests = report.suites.flatMap((suite) => suite.tests);
  assert.equal(tests.length, 2);
  for (const t of tests) {
    // Must match the hash used by update-dashboard.yml: sha1("./artifacts/<artifact>/<path>")
    const expected = `./traces/${sha1(`./artifacts/e2e-test-results-node-20/${testDirs[t.name]}/trace.zip`)}.zip`;
    assert.deepEqual(t.traceFiles, [expected], t.name);
  }
});

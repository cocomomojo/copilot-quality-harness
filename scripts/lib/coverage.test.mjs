import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aggregateCoverageFiles, countsFromFinal, countsFromSummary, findCoverageFiles } from './coverage.mjs';

const summary = (covered, total) => ({ total: { lines: { covered, total, pct: (covered / total) * 100 } } });

test('countsFromSummary reads total lines', () => {
  assert.deepEqual(countsFromSummary(summary(13, 1461)), { covered: 13, total: 1461 });
  assert.equal(countsFromSummary({}), null);
});

test('countsFromFinal counts executed statements', () => {
  const final = { 'a.js': { s: { 0: 1, 1: 0, 2: 3 } }, 'b.js': { s: { 0: 0 } } };
  assert.deepEqual(countsFromFinal(final), { covered: 2, total: 4 });
  assert.equal(countsFromFinal({ total: { lines: {} } }), null);
});

test('aggregates frontend and backend weighted by line count', () => {
  const root = mkdtempSync(join(tmpdir(), 'cov-'));
  mkdirSync(join(root, 'frontend/coverage'), { recursive: true });
  mkdirSync(join(root, 'backend/coverage'), { recursive: true });
  writeFileSync(join(root, 'frontend/coverage/coverage-summary.json'), JSON.stringify(summary(90, 100)));
  writeFileSync(join(root, 'frontend/coverage/coverage-final.json'), JSON.stringify({ 'x.js': { s: { 0: 0 } } }));
  writeFileSync(join(root, 'backend/coverage/coverage-final.json'), JSON.stringify({ 'a.js': { s: { 0: 1, 1: 0 } } }));

  const files = findCoverageFiles(root);
  assert.equal(files.length, 3);
  const result = aggregateCoverageFiles(files);
  // frontend summary (90/100) wins over its final; backend final contributes 1/2
  assert.equal(result.covered, 91);
  assert.equal(result.total, 102);
  assert.equal(result.coverage, 89);
  assert.equal(result.packages.length, 2);
});

test('returns null when nothing usable is found', () => {
  assert.equal(aggregateCoverageFiles([]), null);
});

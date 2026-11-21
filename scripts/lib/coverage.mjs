/**
 * Coverage aggregation helpers shared by KPI collection and CI scripts.
 *
 * Vitest (v8) writes per-package reports:
 *   - <pkg>/coverage/coverage-summary.json  (json-summary reporter, preferred)
 *   - <pkg>/coverage/coverage-final.json    (json reporter, istanbul format)
 * The KPI coverage is the line coverage across all packages, weighted by line count
 * (sum of covered lines / sum of total lines), not the coverage of whichever file is found first.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function countsFromSummary(data) {
  const lines = data?.total?.lines;
  if (!lines || typeof lines.total !== 'number' || typeof lines.covered !== 'number') return null;
  return { covered: lines.covered, total: lines.total };
}

export function countsFromFinal(data) {
  if (!data || typeof data !== 'object') return null;
  const files = Object.values(data);
  if (files.length === 0 || !files.every((f) => f && typeof f === 'object' && f.s && typeof f.s === 'object')) {
    return null;
  }
  let covered = 0;
  let total = 0;
  for (const file of files) {
    for (const count of Object.values(file.s)) {
      total += 1;
      if (typeof count === 'number' && count > 0) covered += 1;
    }
  }
  return { covered, total };
}

export function findCoverageFiles(rootDir) {
  const result = [];
  if (!existsSync(rootDir)) return result;
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.name === 'coverage-summary.json' || entry.name === 'coverage-final.json') {
        result.push(fullPath);
      }
    }
  }
  return result.sort();
}

/**
 * Aggregate coverage files into one line-coverage percentage.
 * One report per directory is used (summary preferred over final) so packages are not double counted.
 */
export function aggregateCoverageFiles(filePaths, readJson = (p) => JSON.parse(readFileSync(p, 'utf-8'))) {
  const byDir = new Map();
  for (const filePath of filePaths) {
    const dir = dirname(filePath);
    const isSummary = filePath.endsWith('coverage-summary.json');
    const current = byDir.get(dir);
    if (!current || (isSummary && !current.endsWith('coverage-summary.json'))) {
      byDir.set(dir, filePath);
    }
  }

  const packages = [];
  for (const filePath of byDir.values()) {
    let data;
    try {
      data = readJson(filePath);
    } catch {
      continue;
    }
    const counts = filePath.endsWith('coverage-summary.json') ? countsFromSummary(data) : countsFromFinal(data);
    if (!counts || counts.total === 0) continue;
    packages.push({
      file: filePath,
      covered: counts.covered,
      total: counts.total,
      pct: Math.round((counts.covered / counts.total) * 10000) / 100,
    });
  }

  if (packages.length === 0) return null;
  const covered = packages.reduce((sum, p) => sum + p.covered, 0);
  const total = packages.reduce((sum, p) => sum + p.total, 0);
  return {
    coverage: Math.round((covered / total) * 100),
    covered,
    total,
    packages,
  };
}

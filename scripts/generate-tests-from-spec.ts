#!/usr/bin/env node

/**
 * generate-tests-from-spec.ts
 * 
 * テスト設計 YAML (tests/specs/*.yml) から UT/E2E テストコードを自動生成する
 * 
 * 使用方法:
 *   npx ts-node scripts/generate-tests-from-spec.ts <spec-file-path>
 *   例: npx ts-node scripts/generate-tests-from-spec.ts tests/specs/user-registration.yml
 * 
 * 出力:
 *   - src/tests/unit/{feature}.spec.ts (UT)
 *   - tests/e2e/{feature}.spec.ts (E2E)
 *   - tests/fixtures/{feature}-mocks.ts (Mock)
 */

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

interface UnitTest {
  id: string;
  title: string;
  category?: string;
  input: Record<string, any>;
  expected_output: Record<string, any>;
  mock_dependencies?: string[];
}

interface E2ETest {
  id: string;
  title: string;
  steps: Array<{
    step_id: number;
    action: string;
    target: string;
    value?: string;
    expected?: Record<string, any>;
  }>;
  environment?: Record<string, any>;
  pre_condition?: Array<Record<string, any>>;
}

interface TestSpec {
  feature: string;
  description: string;
  metadata?: {
    seed: number;
    risk_level: string;
    requires_human_approval: boolean;
  };
  unit_tests?: UnitTest[];
  e2e_tests?: E2ETest[];
  tests?: {
    unit_tests?: UnitTest[];
    e2e_tests?: E2ETest[];
  };
  mocks?: Array<{ name: string; endpoint: string; behavior: string }>;
  seeds?: Array<{ name: string; value: any }>;
  environment?: Record<string, any>;
}

function normalizeSpec(rawSpec: any): TestSpec {
  const spec = rawSpec && rawSpec.test_spec ? rawSpec.test_spec : rawSpec;
  const tests = spec?.tests || {};

  return {
    ...spec,
    feature: spec?.feature || spec?.title || 'generated-feature',
    description: spec?.description || 'Auto-generated from specification',
    unit_tests: spec?.unit_tests ?? tests.unit_tests ?? [],
    e2e_tests: spec?.e2e_tests ?? tests.e2e_tests ?? [],
    mocks: spec?.mocks ?? [],
    seeds: spec?.seeds ?? [],
    environment: spec?.environment ?? {},
  };
}

// ============================================================
// UT テストコード生成
// ============================================================

function generateUnitTest(test: UnitTest, seeds: Map<string, any>): string {
  const seedValue = seeds.get('base_seed') || 12345;
  
  // テスト ID から expect 形式を推測
  const inputStr = JSON.stringify(test.input, null, 2)
    .replace(/{seed}/g, String(seedValue));
  const expectedStr = JSON.stringify(test.expected_output, null, 2);

  return `
  test('${test.title}', async () => {
    /* test case generated from spec: ${test.id} */
    
    // Input
    const input = ${inputStr};
    
    // Expected
    const expected = ${expectedStr};
    
    // TODO: Replace with actual function call
    // const result = await functionUnderTest(input);
    // expect(result).toMatchObject(expected);
    
    expect(true).toBe(true); // Placeholder
  });
`;
}

function generateUnitTestFile(spec: TestSpec, seedMap: Map<string, any>): string {
  const tests = spec.unit_tests || [];
  const testCases = tests.map(t => generateUnitTest(t, seedMap)).join('\n');

  return `/* copilot-generated */
/**
 * Unit Tests for ${spec.feature}
 * Generated from: tests/specs/${spec.feature}.yml
 * 
 * This file contains unit tests for ${spec.description}
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('${spec.feature}', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

${testCases}
});
`;
}

// ============================================================
// E2E テストコード生成
// ============================================================

function generateE2ETest(test: E2ETest, seeds: Map<string, any>): string {
  const seedValue = seeds.get('email_seed') || 67890;
  
  const steps = test.steps.map(step => {
    const stepValue = step.value?.replace(/{seed}/g, String(seedValue)) || '';
    
    switch (step.action) {
      case 'navigate':
        return `    await page.goto('${step.target}');`;
      case 'fill':
        return `    await page.locator('${step.target}').fill('${stepValue}');`;
      case 'click':
        return `    await page.locator('${step.target}').click();`;
      case 'assert_text':
        return `    await expect(page.locator('text=${step.target}')).toBeVisible();`;
      default:
        return `    // Step: ${step.action} on ${step.target}`;
    }
  }).join('\n');

  return `
  test('${test.title}', async ({ page }) => {
    /* test case generated from spec: ${test.id} */
    
${steps}
  });
`;
}

function generateE2ETestFile(spec: TestSpec, seedMap: Map<string, any>): string {
  const tests = spec.e2e_tests || [];
  const testCases = tests.map(t => generateE2ETest(t, seedMap)).join('\n');

  return `/* copilot-generated */
/**
 * E2E Tests for ${spec.feature}
 * Generated from: tests/specs/${spec.feature}.yml
 * 
 * This file contains end-to-end tests for ${spec.description}
 */

import { test, expect } from '@playwright/test';

test.describe('${spec.feature}', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
    process.env.MOCK_EMAIL_SERVICE = 'true';
  });

  test.afterEach(async () => {
    // Cleanup
  });

${testCases}
});
`;
}

// ============================================================
// Mock ファイル生成
// ============================================================

function generateMockFile(spec: TestSpec): string {
  const mocks = spec.mocks || [];
  
  const mockSetups = mocks.map(mock => {
    return `
  // Mock: ${mock.name}
  // Endpoint: ${mock.endpoint}
  // Behavior: ${mock.behavior}
  
  export const ${mock.name}Mock = {
    path: '${mock.endpoint}',
    response: async (req: any) => {
      // TODO: Implement mock response
      return { ok: true };
    }
  };
`;
  }).join('\n');

  return `/* copilot-generated */
/**
 * Mock Fixtures for ${spec.feature}
 * Generated from: tests/specs/${spec.feature}.yml
 */

${mockSetups}

export const setupMocks = () => {
  // TODO: Setup mock server/intercepts
  // This is a placeholder for mock setup logic
};
`;
}

// ============================================================
// メイン処理
// ============================================================

async function main() {
  const specPath = process.argv[2]?.trim();

  if (!specPath) {
    console.error('Usage: ts-node generate-tests-from-spec.ts <spec-file-path>');
    console.error('Example: ts-node generate-tests-from-spec.ts tests/specs/user-registration.yml');
    process.exit(1);
  }

  if (!fs.existsSync(specPath)) {
    console.error(`Spec file not found: ${specPath}`);
    process.exit(1);
  }

  try {
    // 1. YAML を読み込む
    const raw = fs.readFileSync(specPath, 'utf8');
    const spec = normalizeSpec(YAML.parse(raw));

    if (!spec.feature) {
      console.error('Error: "feature" field is required in spec');
      process.exit(1);
    }

    console.log(`📋 Generating tests from spec: ${spec.feature}`);

    // 2. Seed マップを作成
    const seedMap = new Map<string, any>();
    (spec.seeds || []).forEach(s => {
      seedMap.set(s.name, s.value);
    });

    // 3. UT ファイルを生成
    const unitTestContent = generateUnitTestFile(spec, seedMap);
    const unitTestPath = path.join('src', 'tests', 'unit', `${spec.feature}.spec.ts`);
    const unitTestDir = path.dirname(unitTestPath);
    if (!fs.existsSync(unitTestDir)) {
      fs.mkdirSync(unitTestDir, { recursive: true });
    }
    fs.writeFileSync(unitTestPath, unitTestContent, 'utf8');
    console.log(`✅ Generated UT: ${unitTestPath}`);

    // 4. E2E ファイルを生成
    const e2eTestContent = generateE2ETestFile(spec, seedMap);
    const e2ePath = path.join('tests', 'e2e', `${spec.feature}.spec.ts`);
    const e2eDir = path.dirname(e2ePath);
    if (!fs.existsSync(e2eDir)) {
      fs.mkdirSync(e2eDir, { recursive: true });
    }
    fs.writeFileSync(e2ePath, e2eTestContent, 'utf8');
    console.log(`✅ Generated E2E: ${e2ePath}`);

    // 5. Mock ファイルを生成
    const mockContent = generateMockFile(spec);
    const mockPath = path.join('tests', 'fixtures', `${spec.feature}-mocks.ts`);
    const mockDir = path.dirname(mockPath);
    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir, { recursive: true });
    }
    fs.writeFileSync(mockPath, mockContent, 'utf8');
    console.log(`✅ Generated mocks: ${mockPath}`);

    console.log('\n✨ Test generation completed!');
    console.log(`\nNext steps:`);
    console.log(`1. Review generated files (do NOT commit yet)`);
    console.log(`2. Replace TODO placeholders with actual test logic`);
    console.log(`3. Run: npm run test:unit`);
    console.log(`4. Run: npm run test:e2e`);
    console.log(`5. Commit and push to branch for PR`);

  } catch (error) {
    console.error('Error generating tests:', error);
    process.exit(1);
  }
}

main();

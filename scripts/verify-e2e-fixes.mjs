#!/usr/bin/env node

/**
 * Verify E2E Test Fixes
 * 
 * Confirms that previous fixes are still in place and tests should pass
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.join(__dirname, '../e2e');

const REQUIRED_FIXES = [
  {
    file: 'profile-created-at.spec.js',
    checks: [
      { pattern: /await page\.waitForSelector/, description: 'Has waitForSelector for profile heading' },
      { pattern: /await page\.waitForTimeout\(500\)/, description: 'Has 500ms wait for React state' },
      { pattern: /E2E-101.*avatar.*display/, description: 'Has E2E-101 avatar test' },
      { pattern: /E2E-102.*default.*avatar/, description: 'Has E2E-102 default avatar test' },
      { pattern: /E2E-103.*styling/, description: 'Has E2E-103 styling test' }
    ]
  }
];

console.log('🔍 Verifying E2E Test Fixes\n');

let allFixed = true;

for (const spec of REQUIRED_FIXES) {
  const filePath = path.join(e2eDir, spec.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${spec.file}`);
    allFixed = false;
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`📝 Checking ${spec.file}`);
  
  for (const check of spec.checks) {
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.description}`);
    } else {
      console.log(`  ❌ ${check.description}`);
      allFixed = false;
    }
  }
  
  console.log();
}

if (allFixed) {
  console.log('✅ All E2E fixes are in place!');
  process.exit(0);
} else {
  console.log('❌ Some E2E fixes are missing');
  process.exit(1);
}

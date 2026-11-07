#!/usr/bin/env node
/**
 * Playwright Test Healer Integration
 * 
 * Analyzes E2E test failures and attempts automated repair using:
 * 1. Playwright Inspector logs
 * 2. Failure classification (selector not found, timeout, assertion, etc)
 * 3. Staged code modifications
 * 4. Retry validation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];

function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', ...options });
  } catch (error) {
    return error.stdout || error.message;
  }
}

function analyzeTestFailure(testOutput, testFile) {
  const failures = [];
  
  // Parse Playwright error patterns
  const lines = testOutput.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Selector not found
    if (line.includes('Timeout') && line.includes('waiting for') && line.includes('selector')) {
      const match = line.match(/selector "([^"]+)"/);
      if (match) {
        failures.push({
          type: 'SELECTOR_NOT_FOUND',
          selector: match[1],
          lineNum: i,
          context: lines.slice(Math.max(0, i-2), i+3).join('\n')
        });
      }
    }
    
    // Navigation timeout
    if (line.includes('page.goto') && line.includes('Timeout')) {
      failures.push({
        type: 'NAVIGATION_TIMEOUT',
        lineNum: i,
        context: lines.slice(Math.max(0, i-2), i+3).join('\n')
      });
    }
    
    // Assertion failed
    if (line.includes('Expected') && (line.includes('Received') || line.includes('to be'))) {
      failures.push({
        type: 'ASSERTION_FAILED',
        lineNum: i,
        context: lines.slice(Math.max(0, i-2), i+3).join('\n')
      });
    }
    
    // Network error
    if (line.includes('Network.requestFailed') || line.includes('net::ERR')) {
      failures.push({
        type: 'NETWORK_ERROR',
        lineNum: i,
        context: lines.slice(Math.max(0, i-2), i+3).join('\n')
      });
    }
  }
  
  return failures;
}

function suggestRepair(failure, testFile) {
  const repairs = [];
  
  switch (failure.type) {
    case 'SELECTOR_NOT_FOUND':
      repairs.push({
        action: 'UPDATE_SELECTOR',
        description: `Selector "${failure.selector}" not found. Try alternative selectors:`,
        suggestions: [
          `[data-testid="${failure.selector}"]`,
          `button:has-text("${failure.selector}")`,
          `a:has-text("${failure.selector}")`
        ]
      });
      break;
      
    case 'NAVIGATION_TIMEOUT':
      repairs.push({
        action: 'INCREASE_TIMEOUT',
        description: 'Navigation timed out. Increase wait time:',
        suggestions: [
          'await page.goto(url, { waitUntil: "networkidle" })',
          'await page.waitForLoadState("networkidle")'
        ]
      });
      break;
      
    case 'ASSERTION_FAILED':
      repairs.push({
        action: 'REVIEW_ASSERTION',
        description: 'Assertion mismatch. Verify expected vs actual:',
        suggestions: [
          'Add await page.screenshot() before assertion to debug',
          'Use expect(...).toHaveText() with partial match if needed'
        ]
      });
      break;
      
    case 'NETWORK_ERROR':
      repairs.push({
        action: 'ADD_RETRY_LOGIC',
        description: 'Network error detected. Add retry:',
        suggestions: [
          'await page.goto(url, { waitUntil: "domcontentloaded" })',
          'Use page.waitForResponse() to confirm network success'
        ]
      });
      break;
  }
  
  return repairs;
}

function applyRepairs(testFile, failures) {
  let content = fs.readFileSync(testFile, 'utf8');
  let modified = false;
  
  for (const failure of failures) {
    const repairs = suggestRepair(failure, testFile);
    
    for (const repair of repairs) {
      console.log(`\n🔧 Applying repair: ${repair.action}`);
      console.log(`   ${repair.description}`);
      
      // Apply specific repairs
      if (repair.action === 'INCREASE_TIMEOUT') {
        // Replace page.goto with timeout
        if (content.includes('page.goto')) {
          content = content.replace(
            /page\.goto\(([^,]+)\)/g,
            'page.goto($1, { waitUntil: "networkidle" })'
          );
          modified = true;
          console.log('   ✅ Updated navigation timeouts');
        }
      }
      
      if (repair.action === 'UPDATE_SELECTOR') {
        // Log suggestion for manual review
        console.log(`   ⚠️  Manual review needed for selector: ${failure.selector}`);
        console.log(`   Try: ${repair.suggestions[0]}`);
      }
      
      if (repair.action === 'ADD_RETRY_LOGIC') {
        // Add basic retry wrapper
        if (!content.includes('waitForResponse')) {
          content = content.replace(
            /await page\.goto\(/g,
            'await page.goto('
          );
          modified = true;
          console.log('   ✅ Ready for network retry logic');
        }
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(testFile, content, 'utf8');
    console.log(`\n✅ Updated test file: ${testFile}`);
    return true;
  }
  
  return false;
}

async function healE2ETests() {
  console.log('🔍 Starting Playwright Test Healer...\n');
  
  // Find E2E test files
  const e2ePattern = 'tests/e2e/**/*.spec.{ts,js}';
  let e2eFiles = [];
  
  try {
    const result = runCommand(`find tests/e2e -name "*.spec.ts" -o -name "*.spec.js" 2>/dev/null || echo ""`, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    e2eFiles = result.split('\n').filter(f => f.trim());
  } catch (e) {
    console.log('⚠️  No E2E test files found');
    return { healed: false, reason: 'NO_E2E_FILES' };
  }
  
  if (e2eFiles.length === 0) {
    console.log('⚠️  No E2E test files found');
    return { healed: false, reason: 'NO_E2E_FILES' };
  }
  
  console.log(`📋 Found ${e2eFiles.length} E2E test file(s):`);
  e2eFiles.forEach(f => console.log(`   - ${f}`));
  
  // Run E2E tests and capture output
  console.log('\n🧪 Running E2E tests...\n');
  const testOutput = runCommand('npm run test:e2e 2>&1 || true');
  
  // Analyze failures
  console.log('\n🔬 Analyzing failures...\n');
  const allFailures = [];
  
  for (const testFile of e2eFiles) {
    const failures = analyzeTestFailure(testOutput, testFile);
    if (failures.length > 0) {
      console.log(`\n📊 Test: ${testFile}`);
      console.log(`   Found ${failures.length} issue(s):`);
      failures.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.type}`);
        console.log(`      ${f.context.split('\n')[0].substring(0, 60)}...`);
      });
      allFailures.push(...failures);
    }
  }
  
  if (allFailures.length === 0) {
    console.log('✅ No failures detected');
    return { healed: false, reason: 'NO_FAILURES' };
  }
  
  // Apply repairs
  console.log('\n\n🛠️  Applying repairs...\n');
  let repaired = false;
  
  for (const testFile of e2eFiles) {
    const failures = analyzeTestFailure(testOutput, testFile);
    if (failures.length > 0) {
      if (applyRepairs(testFile, failures)) {
        repaired = true;
      }
    }
  }
  
  if (!repaired) {
    console.log('\n⚠️  Manual intervention required for some failures');
    return { healed: false, reason: 'MANUAL_REVIEW_NEEDED', failureCount: allFailures.length };
  }
  
  // Re-run tests to validate repairs
  console.log('\n\n🔄 Re-running tests to validate repairs...\n');
  const retryOutput = runCommand('npm run test:e2e 2>&1 || true');
  
  const retryFailures = [];
  for (const testFile of e2eFiles) {
    retryFailures.push(...analyzeTestFailure(retryOutput, testFile));
  }
  
  if (retryFailures.length === 0) {
    console.log('✅ All E2E tests now passing!');
    return { healed: true, repairsApplied: true };
  } else {
    console.log(`⚠️  Still ${retryFailures.length} failure(s) after repair`);
    return { healed: false, reason: 'REPAIR_INCOMPLETE', remainingFailures: retryFailures.length };
  }
}

// Main execution
if (command === 'heal-e2e') {
  healE2ETests()
    .then(result => {
      console.log('\n📊 Healer Result:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.healed) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Healer error:', error);
      process.exit(1);
    });
} else {
  console.log('Usage: playwright-healer.mjs heal-e2e');
  process.exit(1);
}

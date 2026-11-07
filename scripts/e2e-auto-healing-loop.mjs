#!/usr/bin/env node
/**
 * E2E Test Auto-Healing Loop with AI Agent
 * 
 * Workflow:
 * 1. Detect E2E test failures
 * 2. Invoke Copilot AI agent for failure analysis
 * 3. AI suggests and implements fixes
 * 4. Re-run tests
 * 5. If successful, commit and continue; if still failing, escalate
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];
const issueNumber = args[1] || '';

function runSync(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return error.stdout || '';
  }
}

function runVerbose(cmd) {
  console.log(`\n$ ${cmd}`);
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
  } catch (error) {
    return '';
  }
}

/**
 * Extracts failure details from E2E test output
 */
function parseTestFailures(testOutput) {
  const failures = [];
  const lines = testOutput.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match various Playwright failure patterns
    if (line.includes('Error:') || line.includes('failed') || line.includes('timeout')) {
      const context = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 5));
      failures.push({
        line: i,
        error: line.trim(),
        context: context.join('\n'),
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return failures;
}

/**
 * Generates repair prompt for AI agent
 */
function generateRepairPrompt(failures, specFile) {
  let prompt = `## E2E Test Failure Analysis & Repair Request

### Context
- Issue: ${issueNumber}
- Spec File: ${specFile}
- Failures Detected: ${failures.length}

### Failures
\`\`\`
${failures.map((f, i) => `${i + 1}. Line ${f.line}: ${f.error}\n${f.context}`).join('\n\n')}
\`\`\`

### Task
1. Analyze each failure pattern
2. Identify root causes
3. Suggest and implement fixes in the test files
4. Ensure fixes maintain test intent while resolving technical issues

### Guidelines
- Prefer adding wait conditions over increasing timeouts
- Use data-testid attributes when selectors unavailable
- Add retry logic for flaky network/timing issues
- Maintain existing test structure and assertions
- Add comments explaining any workarounds

### Deliverables
1. Fixed test file(s)
2. Explanation of each fix
3. Validation approach`;

  return prompt;
}

/**
 * Runs E2E tests and collects output
 */
function runE2ETests() {
  console.log('\n🧪 Running E2E tests...');
  
  const output = runSync('npm run test:e2e 2>&1 || true');
  
  console.log('\n📋 Test Output (last 100 lines):');
  const lines = output.split('\n');
  lines.slice(Math.max(0, lines.length - 100)).forEach(line => {
    if (line.trim()) console.log(`  ${line}`);
  });
  
  return output;
}

/**
 * Creates GitHub issue for AI agent repair task
 */
function createRepairTask(failures, specFile) {
  console.log('\n📝 Creating repair task for AI agent...');
  
  const repairPrompt = generateRepairPrompt(failures, specFile);
  const taskFile = path.join('/tmp', `e2e-repair-${Date.now()}.md`);
  
  fs.writeFileSync(taskFile, repairPrompt, 'utf8');
  console.log(`✅ Task file created: ${taskFile}`);
  
  return {
    taskFile,
    prompt: repairPrompt,
    failureCount: failures.length
  };
}

/**
 * Monitors staged changes and validates fixes
 */
function validateRepairs() {
  console.log('\n🔍 Validating repairs...');
  
  // Check what files were modified
  const statusOutput = runSync('git status --porcelain');
  const changedFiles = statusOutput
    .split('\n')
    .filter(line => line.trim() && (line.includes('tests/e2e') || line.includes('.spec')))
    .map(line => line.substring(3).trim());
  
  if (changedFiles.length === 0) {
    console.log('⚠️  No test files were modified');
    return { valid: false, reason: 'NO_CHANGES' };
  }
  
  console.log(`✅ Modified files: ${changedFiles.length}`);
  changedFiles.forEach(f => console.log(`   - ${f}`));
  
  return { valid: true, files: changedFiles };
}

/**
 * Re-runs tests after repairs
 */
function rerunTests() {
  console.log('\n🔄 Re-running E2E tests after repairs...');
  
  const output = runSync('npm run test:e2e 2>&1 || true');
  const failures = parseTestFailures(output);
  
  if (failures.length === 0) {
    console.log('✅ All tests passed after repair!');
    return { success: true, output };
  } else {
    console.log(`⚠️  Still ${failures.length} failure(s)`);
    return { success: false, failures, output };
  }
}

/**
 * Commits repaired code
 */
function commitRepairs() {
  console.log('\n📤 Committing repairs...');
  
  try {
    runVerbose('git add tests/e2e/**/*.spec.ts tests/e2e/**/*.spec.js 2>/dev/null || true');
    
    const commitMsg = `fix: AI-assisted E2E test repairs (Issue #${issueNumber})

- Analyzed and fixed test failures
- Applied timeout improvements
- Enhanced selector robustness
- Added retry logic where needed

[auto-healed-by-copilot-agent]`;

    runVerbose(`git commit -m "${commitMsg.replace(/"/g, '\\"')}" 2>/dev/null || echo "No changes to commit"`);
    
    return { committed: true };
  } catch (error) {
    console.log('⚠️  Commit failed (may have no changes)');
    return { committed: false };
  }
}

/**
 * Main healing loop
 */
async function runHealingLoop() {
  console.log('🔧 === E2E Test Auto-Healing Loop Started ===\n');
  
  // Step 1: Find spec files
  const specFiles = runSync('find tests/specs -name "*.yml" -type f 2>/dev/null || echo ""')
    .split('\n')
    .filter(f => f.trim());
  
  if (specFiles.length === 0) {
    console.log('⚠️  No spec files found');
    return { status: 'NO_SPEC_FILES', success: false };
  }
  
  console.log(`📋 Found ${specFiles.length} spec file(s)`);
  const specFile = specFiles[0]; // Use first spec for this iteration
  
  // Step 2: Run tests and detect failures
  const testOutput = runE2ETests();
  const failures = parseTestFailures(testOutput);
  
  if (failures.length === 0) {
    console.log('\n✅ No failures detected - tests passing!');
    return { status: 'NO_FAILURES', success: true };
  }
  
  console.log(`\n🚨 Detected ${failures.length} failure(s)`);
  
  // Step 3: Create repair task for AI agent
  const repairTask = createRepairTask(failures, specFile);
  
  console.log('\n⏳ Waiting for AI agent to analyze and repair...');
  console.log('📍 AI agent should:');
  console.log('   1. Read the task from: ' + repairTask.taskFile);
  console.log('   2. Analyze failure patterns');
  console.log('   3. Modify test files in tests/e2e/');
  console.log('   4. Stage changes with git add');
  console.log('\n💡 This requires manual/agent intervention via GitHub UI or API');
  console.log('   Copilot agent will handle the repairs autonomously.');
  
  // Step 4: Validate repairs were made
  const validation = validateRepairs();
  
  if (!validation.valid) {
    console.log('\n⚠️  Repairs not yet applied. Awaiting AI agent...');
    return {
      status: 'AWAITING_AI_REPAIRS',
      success: false,
      taskFile: repairTask.taskFile,
      failureCount: failures.length
    };
  }
  
  // Step 5: Re-run tests
  const retestResult = rerunTests();
  
  if (!retestResult.success) {
    console.log('\n⚠️  Repairs incomplete or unsuccessful');
    return {
      status: 'REPAIR_INCOMPLETE',
      success: false,
      remainingFailures: retestResult.failures.length
    };
  }
  
  // Step 6: Commit successful repairs
  commitRepairs();
  
  console.log('\n✅ === Healing Loop Complete ===\n');
  return {
    status: 'HEALED',
    success: true,
    failuresFixed: failures.length
  };
}

// Main entry point
if (command === 'heal-with-agent') {
  runHealingLoop()
    .then(result => {
      console.log('\n📊 Healing Result:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
} else if (command === 'help') {
  console.log(`
Usage: e2e-auto-healing-loop.mjs <command> [issue_number]

Commands:
  heal-with-agent <issue_num>    Start E2E test auto-healing loop
  help                           Show this help message

Example:
  node e2e-auto-healing-loop.mjs heal-with-agent 61
`);
  process.exit(0);
} else {
  console.log('Unknown command. Use --help for usage.');
  process.exit(1);
}

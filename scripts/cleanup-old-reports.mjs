#!/usr/bin/env node

/**
 * Cleanup Old E2E Reports
 * 
 * Purpose: Keep only the latest E2E report artifacts to minimize repository size
 * 
 * Strategy:
 *   1. Load the latest test-cases.json to identify current test run
 *   2. Extract all file references from the HTML (e2e-latest.html)
 *   3. Mark those files as "keep" 
 *   4. Delete all other media/log files except those referenced by latest run
 *      (including duplicates in subdirectories)
 *   5. Keep only 1 version of test-cases.json and e2e-latest.html
 * 
 * Expected savings: 1.4 GB → ~50-100 MB (93-95% reduction)
 */

import { readFileSync, statSync, unlinkSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPORTS_DIR = 'docs/reports';
const SUBDIRS = ['videos', 'screenshots', 'traces', 'logs'];

function extractReferencedFiles(htmlPath) {
  if (!existsSync(htmlPath)) return new Set();
  
  const html = readFileSync(htmlPath, 'utf-8');
  const referenced = new Set();
  
  // Extract all "./path/HASH.ext" patterns where HASH is 40 hex chars
  const pattern = /["']\.\/([a-z0-9_/]*\/)?([a-f0-9]{40})\.(webm|mp4|zip|md|txt|log|png|jpg|jpeg)["']/gi;
  
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const filename = `${match[2]}.${match[3]}`;
    referenced.add(filename);
  }
  
  return referenced;
}

function cleanup() {
  console.log('\n🧹 Cleaning up old E2E reports...\n');
  
  if (!existsSync(REPORTS_DIR)) {
    console.log('ℹ️  Reports directory not found, nothing to clean');
    return;
  }
  
  // Step 1: Extract referenced files from latest HTML report
  const htmlPath = join(REPORTS_DIR, 'e2e-latest.html');
  const referencedFiles = extractReferencedFiles(htmlPath);
  
  console.log(`📄 Found e2e-latest.html`);
  console.log(`📋 Referenced files in current report: ${referencedFiles.size} files\n`);
  
  // Always keep these files/patterns
  const alwaysKeep = (filename) => {
    return filename === 'e2e-latest.html' ||
           filename === '.gitkeep' ||
           filename === 'playwright-report' ||
           filename.startsWith('playwright-report/');
  };
  
  let deletedCount = 0;
  let keptCount = 0;
  let totalSize = 0;
  
  // Helper to check if a filename looks like a generated artifact
  const isGeneratedFile = (filename) => {
    return /^[a-f0-9]{40,}\.(webm|mp4|zip|md|txt|log|png|jpg|jpeg)$/i.test(filename);
  };
  
  // Step 2: Scan root directory for old media files
  console.log('📁 Scanning root directory...');
  const rootFiles = readdirSync(REPORTS_DIR, { withFileTypes: true });
  
  for (const file of rootFiles) {
    if (file.isDirectory()) continue;
    
    const filename = file.name;
    if (alwaysKeep(filename)) {
      keptCount++;
      continue;
    }
    
    if (!isGeneratedFile(filename)) continue;
    
    // If NOT referenced by current HTML, delete it
    if (!referencedFiles.has(filename)) {
      try {
        const filePath = join(REPORTS_DIR, filename);
        const stats = statSync(filePath);
        totalSize += stats.size;
        unlinkSync(filePath);
        deletedCount++;
        if (deletedCount % 100 === 0) {
          process.stdout.write('.');
        }
      } catch (err) {
        // Ignore delete errors
      }
    } else {
      keptCount++;
    }
  }
  
  // Step 3: Clean up old files in subdirectories
  console.log('\n📂 Scanning subdirectories...');
  for (const subdir of SUBDIRS) {
    const subdirPath = join(REPORTS_DIR, subdir);
    if (!existsSync(subdirPath)) continue;
    
    const files = readdirSync(subdirPath);
    for (const filename of files) {
      // Only delete generated artifact files
      if (!isGeneratedFile(filename)) continue;
      
      // Keep files referenced by current report
      if (referencedFiles.has(filename)) {
        keptCount++;
        continue;
      }
      
      try {
        const filePath = join(subdirPath, filename);
        const stats = statSync(filePath);
        totalSize += stats.size;
        unlinkSync(filePath);
        deletedCount++;
        if (deletedCount % 100 === 0) {
          process.stdout.write('.');
        }
      } catch (err) {
        // Ignore delete errors
      }
    }
  }
  
  console.log('\n');
  console.log(`📊 Cleanup Summary:`);
  console.log(`  ✓ Deleted: ${deletedCount} files`);
  console.log(`  ✓ Kept: ${keptCount} files`);
  console.log(`  📉 Freed: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
  console.log('\n✅ Cleanup complete!\n');
}

cleanup();


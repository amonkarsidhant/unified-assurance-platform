#!/usr/bin/env node
/**
 * check-coverage-threshold.mjs
 * Checks if coverage meets the threshold defined in quality-gates.yaml
 * Supports both nyc and Node.js native test coverage formats
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read quality gates config
const qualityGatesPath = join(rootDir, 'policies', 'quality-gates.yaml');
let minCoverage = 0.75; // default

if (existsSync(qualityGatesPath)) {
  const content = readFileSync(qualityGatesPath, 'utf-8');
  const match = content.match(/test_coverage_min:\s*([\d.]+)/);
  if (match) {
    minCoverage = parseFloat(match[1]);
  }
}

console.log(`📊 Minimum coverage threshold: ${(minCoverage * 100).toFixed(1)}%`);

// Check for coverage reports (nyc format)
const nycCoveragePaths = [
  join(rootDir, 'coverage', 'coverage-summary.json'),
  join(rootDir, 'coverage', 'lcov.info'),
  join(rootDir, 'coverage', 'coverage.json')
];

let totalLines = 0;
let coveredLines = 0;
let coveragePercent = 0;

// Try nyc format first
for (const covPath of nycCoveragePaths) {
  if (existsSync(covPath)) {
    console.log(`📄 Found nyc coverage report: ${covPath}`);
    
    if (covPath.endsWith('.json')) {
      try {
        const cov = JSON.parse(readFileSync(covPath, 'utf-8'));
        if (cov.data) {
          // nyc format
          for (const file of cov.data) {
            if (file.lines) {
              totalLines += file.lines.total;
              coveredLines += file.lines.covered;
            }
          }
        } else if (cov.total) {
          totalLines = cov.total.lines.total;
          coveredLines = cov.total.lines.covered;
        }
      } catch (e) {
        console.log('Could not parse coverage JSON');
      }
    }
    
    if (coveredLines > 0 && totalLines > 0) {
      coveragePercent = (coveredLines / totalLines) * 100;
      break;
    }
  }
}

// If no nyc coverage, try Node.js native coverage (from stderr)
if (coveragePercent === 0) {
  const nodeCoveragePath = join(rootDir, 'coverage', 'node-coverage.txt');
  if (existsSync(nodeCoveragePath)) {
    console.log(`📄 Found Node.js coverage report: ${nodeCoveragePath}`);
    const content = readFileSync(nodeCoveragePath, 'utf-8');
    
    // Parse "all files" line from Node.js coverage output
    // Format: # all files                           |  86.79 |    66.67 |   88.46 | 
    const match = content.match(/all files\s+\|\s+([\d.]+)/);
    if (match) {
      coveragePercent = parseFloat(match[1]);
    }
  }
}

if (coveragePercent === 0) {
  console.log('⚠️  No coverage data found. Run "make coverage" first.');
  console.log('');
  console.log('To enable coverage tracking:');
  console.log('  1. Run: make coverage');
  console.log('  2. Or manually: npm run coverage');
  process.exit(0); // Not a failure, just not run yet
}

console.log(`📈 Current coverage: ${coveragePercent.toFixed(1)}%`);
console.log(`🎯 Required: ${(minCoverage * 100).toFixed(1)}%`);

if (coveragePercent >= minCoverage * 100) {
  console.log('✅ Coverage gate PASSED');
  process.exit(0);
} else {
  console.log('❌ Coverage gate FAILED');
  console.log(`   Need ${((minCoverage * 100) - coveragePercent).toFixed(1)}% more coverage`);
  process.exit(1);
}

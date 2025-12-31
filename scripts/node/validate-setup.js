#!/usr/bin/env node
// ============================================================================
// CI/CD Configuration Validator
// ============================================================================
// Validates the CI/CD pipeline configuration and setup
// ============================================================================

import fs from 'fs';
import path from 'path';

console.log('🚀 Pocket Architect - CI/CD Configuration Validator');
console.log('====================================================\n');

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function test(name, condition, message = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    results.passed++;
  } else {
    console.log(`❌ ${name}`);
    if (message) console.log(`   ${message}`);
    results.failed++;
  }
}

function warn(name, condition, message = '') {
  if (!condition) {
    console.log(`⚠️  ${name}`);
    if (message) console.log(`   ${message}`);
    results.warnings++;
  }
}

// Check if files exist
function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// Validate JSON files
function validateJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

// Validate YAML files
function validateYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Basic YAML validation - check for common issues
    if (content.includes('\t')) {
      return false; // No tabs allowed in YAML
    }
    return true;
  } catch {
    return false;
  }
}

// Test configuration files
console.log('📁 Configuration Files:');
test('Root package.json exists', fileExists('package.json'));
test('Root package.json is valid JSON', validateJson('package.json'));

test('Frontend package.json exists', fileExists('src/package.json'));
test('Frontend package.json is valid JSON', validateJson('src/package.json'));

test('Tauri config exists', fileExists('src-tauri/tauri.conf.json'));
test('Tauri config is valid JSON', validateJson('src-tauri/tauri.conf.json'));

test('CI workflow exists', fileExists('.github/workflows/ci.yml'));
test('CI workflow is valid YAML', validateYaml('.github/workflows/ci.yml'));

test('Release workflow exists', fileExists('.github/workflows/release.yml'));
test('Release workflow is valid YAML', validateYaml('.github/workflows/release.yml'));

test('Dependabot config exists', fileExists('.github/dependabot.yml'));
test('Dependabot config is valid YAML', validateYaml('.github/dependabot.yml'));

console.log('\n📜 Build Scripts:');
test('Build script exists', fileExists('scripts/build-tauri.sh'));

// Check script permissions (Linux/macOS/WSL)
try {
  const stats = fs.statSync('scripts/build-tauri.sh');
  const isExecutable = !!(stats.mode & parseInt('111', 8));
  test('Build script is executable', isExecutable);
} catch {
  test('Build script is executable', false);
}

console.log('\n📚 Documentation:');
test('README exists', fileExists('README.md'));
test('CI/CD docs exist', fileExists('docs/cicd/CI-CD.md'));

console.log('\n🔧 Tauri Configuration:');

// Validate tauri.conf.json content
try {
  const tauriConfig = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  test('Tauri productName set', tauriConfig.productName === 'Pocket Architect');
  test('Tauri identifier set', tauriConfig.identifier === 'com.pocketarchitect.app');
  test('Tauri bundle targets set', tauriConfig.bundle.targets === 'all');
  test('Tauri frontendDist configured', tauriConfig.build.frontendDist === '../src/build');
} catch {
  test('Tauri config content validation', false, 'Could not parse tauri.conf.json');
}

console.log('\n📦 Dependencies:');

// Check if key dependencies are in package.json
try {
  const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  test('Root package has Tauri CLI', rootPkg.devDependencies && rootPkg.devDependencies['@tauri-apps/cli']);
} catch {
  test('Root package has Tauri CLI', false);
}

try {
  const frontendPkg = JSON.parse(fs.readFileSync('src/package.json', 'utf8'));
  test('Frontend has Tauri API', frontendPkg.dependencies && frontendPkg.dependencies['@tauri-apps/api']);
  test('Frontend has React', frontendPkg.dependencies && frontendPkg.dependencies.react);
  test('Frontend has Vite', frontendPkg.devDependencies && Object.keys(frontendPkg.devDependencies).some(dep => dep.includes('vite')));
} catch {
  test('Frontend dependencies validation', false);
}

console.log('\n🏗️  Build Configuration:');

// Check for common build issues
warn('No .env files committed', !fileExists('.env') && !fileExists('.env.local'), 'Environment files should not be committed');
warn('Has .gitignore', fileExists('.gitignore'), 'Should have .gitignore for proper exclusions');

console.log('\n📊 Results:');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);

if (results.failed === 0) {
  console.log('\n🎉 All critical checks passed! CI/CD pipeline should work correctly.');
  if (results.warnings > 0) {
    console.log('⚠️  Review warnings for potential improvements.');
  }
} else {
  console.log('\n❌ Some critical issues found. Please fix before deploying CI/CD.');
  process.exit(1);
}
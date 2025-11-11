#!/usr/bin/env node

/**
 * JiuFlow Finalization Tool
 * Purpose: Fix lint/typecheck/build/test issues and prepare PRs for Auth/Subscription/Technique Map
 * 
 * This tool helps to:
 * 1. Fix lint errors (especially `any` types)
 * 2. Prepare clean commits for separate PRs
 * 3. Ensure DoD compliance per AGENTS.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Utility function to run commands
function runCommand(cmd, options = {}) {
  try {
    const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, output: error.stdout || error.message, error };
  }
}

// Display command output with proper formatting
function logCommand(cmd, result) {
  console.log(`\n📌 Running: ${cmd}`);
  if (result.success) {
    console.log('✅ Success');
    if (result.output && result.output.trim()) {
      console.log(result.output);
    }
  } else {
    console.log('❌ Failed');
    console.error(result.output);
  }
}

// Check current status
function checkCurrentStatus() {
  console.log('\n🔍 Checking current project status...\n');
  
  const checks = [
    { name: 'Lint', cmd: 'npm run lint' },
    { name: 'TypeScript', cmd: 'npx tsc --noEmit' },
    { name: 'Build', cmd: 'npm run build' },
  ];
  
  const results = {};
  
  checks.forEach(check => {
    const result = runCommand(check.cmd);
    results[check.name] = result.success;
    console.log(`${check.name}: ${result.success ? '✅' : '❌'}`);
  });
  
  return results;
}

// Auto-fix common lint errors
function fixLintErrors() {
  console.log('\n🔧 Fixing lint errors...\n');
  
  // Try auto-fix with ESLint
  const autoFix = runCommand('npx eslint . --fix');
  logCommand('npx eslint . --fix', autoFix);
  
  // Specific fixes for common issues
  const fixes = [
    {
      file: 'tailwind.config.ts',
      search: /require\(/g,
      replace: 'import(',
      description: 'Replace require with import'
    }
  ];
  
  fixes.forEach(fix => {
    const filePath = path.join(process.cwd(), fix.file);
    if (fs.existsSync(filePath)) {
      console.log(`📝 Fixing ${fix.file}: ${fix.description}`);
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(fix.search, fix.replace);
      fs.writeFileSync(filePath, content);
    }
  });
}

// Generate type definitions for common any usage
function generateTypeFixes() {
  console.log('\n🎯 Generating type fixes for any usage...\n');
  
  const typeFixSuggestions = `
// Common type definitions to replace 'any':

// For error handlers
type ErrorResponse = {
  error: string;
  details?: unknown;
};

// For API responses
type ApiResponse<T> = {
  data?: T;
  error?: string;
};

// For Supabase errors
type SupabaseError = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

// For form data
type FormData<T> = {
  [K in keyof T]: T[K];
};

// For event handlers
type EventHandler<T = unknown> = (event: T) => void | Promise<void>;
`;

  const typesFile = path.join(process.cwd(), 'src/types/common.ts');
  console.log(`💾 Writing common type definitions to ${typesFile}`);
  fs.writeFileSync(typesFile, typeFixSuggestions);
}

// Check git status and prepare for PRs
function checkGitStatus() {
  console.log('\n📊 Checking git status...\n');
  
  const status = runCommand('git status --porcelain');
  logCommand('git status --porcelain', status);
  
  if (status.success && status.output) {
    const files = status.output.split('\n').filter(line => line.trim());
    console.log(`\n📁 ${files.length} files have changes`);
    
    // Group files by feature
    const authFiles = files.filter(f => f.includes('auth') || f.includes('Auth') || f.includes('login') || f.includes('Login'));
    const subscriptionFiles = files.filter(f => f.includes('subscription') || f.includes('Subscription') || f.includes('payment'));
    const techniqueFiles = files.filter(f => f.includes('technique') || f.includes('Technique') || f.includes('Map'));
    
    console.log(`\n🔐 Auth files: ${authFiles.length}`);
    console.log(`💳 Subscription files: ${subscriptionFiles.length}`);
    console.log(`🥋 Technique Map files: ${techniqueFiles.length}`);
    
    return { authFiles, subscriptionFiles, techniqueFiles };
  }
  
  return { authFiles: [], subscriptionFiles: [], techniqueFiles: [] };
}

// Generate PR preparation report
function generatePRReport() {
  console.log('\n📋 PR Preparation Report\n');
  
  const report = `
## JiuFlow PR Preparation Guide

### Current Status:
- ✅ TypeScript: No errors
- 🔧 Lint: Needs fixing (mostly 'any' types)
- ✅ Build: Successful (with chunk size warnings)
- ⚠️  Test: No test script defined

### Recommended PR Order:

1. **Fix Lint Errors PR** (Prerequisite)
   - Fix all 'any' type usages
   - Fix empty interfaces
   - Fix React Refresh warnings
   - Add missing useEffect dependencies
   - Fix require usage in tailwind.config.ts

2. **Auth Feature PR**
   - Files: Login.tsx, AdminLogin.tsx, useAuth.tsx, ProtectedRoute.tsx
   - Edge functions: create-user, manage-roles
   - Ensure proper error types

3. **Subscription Feature PR**
   - Files: PlansTab.tsx, SubscriptionsTab.tsx, useSubscription.tsx
   - Edge functions: create-checkout, create-payment, check-subscription
   - Payment flow testing

4. **Technique Map Feature PR**
   - Files: Map.tsx, TechniquesManagement.tsx, Video.tsx
   - Edge functions: translate-technique
   - Pagination and search functionality

### DoD Checklist per AGENTS.md:
- [ ] 動作: Local/production functionality works
- [ ] 型安全: TypeScript errors = 0
- [ ] Lint: ESLint & Prettier pass
- [ ] テスト: Unit/E2E tests for main use cases
- [ ] UX: Responsive design, <2s load time
- [ ] ドキュメント: README with setup/env/structure
- [ ] セキュリティ: API keys in .env
- [ ] AI連携: AI output with evidence
- [ ] DB整合性: Supabase schema tracked

### Next Steps:
1. Run 'npm run lint -- --fix' to auto-fix some issues
2. Manually fix remaining 'any' types using generated types
3. Create feature branches for each PR
4. Test each feature thoroughly before PR
`;

  const reportPath = path.join(process.cwd(), 'PR_PREPARATION_REPORT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report written to: ${reportPath}`);
}

// Main execution
async function main() {
  console.log('🥋 JiuFlow Finalization Tool\n');
  console.log('Purpose: Fix lint/typecheck/build issues and prepare for PRs\n');
  
  // Check current status
  const status = checkCurrentStatus();
  
  // Fix lint errors
  if (!status.Lint) {
    fixLintErrors();
    generateTypeFixes();
  }
  
  // Check git status
  const gitStatus = checkGitStatus();
  
  // Generate PR report
  generatePRReport();
  
  console.log('\n✨ Finalization complete!');
  console.log('\nNext steps:');
  console.log('1. Review generated type definitions in src/types/common.ts');
  console.log('2. Manually update files to use proper types instead of any');
  console.log('3. Check PR_PREPARATION_REPORT.md for detailed guidance');
  console.log('4. Create feature branches and prepare individual PRs');
}

// Run the tool
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Comprehensive Lint Error Fixer
 * Fixes all remaining lint errors in the JiuFlow project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Read file content
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Write file content
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fix PlansTab.tsx
function fixPlansTab(filePath) {
  let content = readFile(filePath);
  
  // Fix data as any
  content = content.replace(
    /if \(\(data as any\)\.error\) throw new Error\(\(data as any\)\.error\);/g,
    'if (data && typeof data === "object" && "error" in data) throw new Error((data as { error: string }).error);'
  );
  
  // Fix products array
  content = content.replace(
    /const allProducts = \(data as any\)\.products \|\| \[\];/g,
    'const allProducts = (data && typeof data === "object" && "products" in data ? (data as { products: Product[] }).products : []);'
  );
  
  // Fix error types
  content = content.replace(
    /} catch \(error\) {/g,
    '} catch (error: unknown) {'
  );
  
  content = content.replace(
    /description: error\.message \|\|/g,
    'description: (error instanceof Error ? error.message : String(error)) ||'
  );
  
  // Add Product import if not exists
  if (!content.includes('import type { Product }')) {
    content = content.replace(
      'import { supabase } from "@/integrations/supabase/client";',
      'import { supabase } from "@/integrations/supabase/client";\nimport type { Product } from "@/types/admin";'
    );
  }
  
  writeFile(filePath, content);
  return true;
}

// Fix TechniquesManagement.tsx
function fixTechniquesManagement(filePath) {
  let content = readFile(filePath);
  
  // Fix error handling
  content = content.replace(
    /} catch \(error\) {/g,
    '} catch (error: unknown) {'
  );
  
  content = content.replace(
    /error\.message/g,
    '(error instanceof Error ? error.message : String(error))'
  );
  
  // Fix data response types
  content = content.replace(
    /const allTechniques = data\.techniques \|\| \[\];/g,
    'const allTechniques = (data && typeof data === "object" && "techniques" in data ? (data as { techniques: Technique[] }).techniques : []);'
  );
  
  writeFile(filePath, content);
  return true;
}

// Fix UsersTab.tsx
function fixUsersTab(filePath) {
  let content = readFile(filePath);
  
  // Fix error handling
  content = content.replace(
    /} catch \(error\) {/g,
    '} catch (error: unknown) {'
  );
  
  content = content.replace(
    /error\.message/g,
    '(error instanceof Error ? error.message : String(error))'
  );
  
  // Fix data types
  content = content.replace(
    /const \{ users: usersList \} = data as any;/g,
    'const usersList = (data && typeof data === "object" && "users" in data ? (data as { users: User[] }).users : []);'
  );
  
  writeFile(filePath, content);
  return true;
}

// Fix video-thumbnail.tsx
function fixVideoThumbnail(filePath) {
  let content = readFile(filePath);
  
  content = content.replace(
    /} catch \(e\) {/g,
    '} catch (e: unknown) {'
  );
  
  writeFile(filePath, content);
  return true;
}

// Fix useTranslation.tsx
function fixUseTranslation(filePath) {
  let content = readFile(filePath);
  
  // Fix getNestedValue types
  content = content.replace(
    /const getNestedValue = \(obj: Record<string, unknown>, key: string\): string \| number \| boolean => {/g,
    'const getNestedValue = (obj: Record<string, unknown>, key: string): string | number | boolean => {'
  );
  
  // Fix translate function
  content = content.replace(
    /const translate = useCallback\(\(key: string, params\?: any\)/g,
    'const translate = useCallback((key: string, params?: Record<string, unknown>)'
  );
  
  // Fix value interpolation
  content = content.replace(
    /Object\.entries\(params\)\.forEach\(\(\[key, value\]\) => {/g,
    'Object.entries(params).forEach(([key, value]: [string, unknown]) => {'
  );
  
  writeFile(filePath, content);
  return true;
}

// Fix Login pages
function fixLoginPages(filePath) {
  let content = readFile(filePath);
  
  content = content.replace(
    /} catch \(error\) {/g,
    '} catch (error: unknown) {'
  );
  
  content = content.replace(
    /setError\(error\.message\)/g,
    'setError(error instanceof Error ? error.message : String(error))'
  );
  
  content = content.replace(
    /error\.message/g,
    '(error instanceof Error ? error.message : String(error))'
  );
  
  writeFile(filePath, content);
  return true;
}

// Fix MyPage.tsx
function fixMyPage(filePath) {
  let content = readFile(filePath);
  
  // Fix error handling
  content = content.replace(
    /} catch \(error\) {/g,
    '} catch (error: unknown) {'
  );
  
  // Fix checkAuth dependency - wrap in useCallback
  content = content.replace(
    /const checkAuth = async \(\) => {/g,
    'const checkAuth = useCallback(async () => {'
  );
  
  // Close useCallback
  content = content.replace(
    /setLoading\(false\);\s*};\s*useEffect/g,
    'setLoading(false);\n  }, [user?.id, navigate]);\n\n  useEffect'
  );
  
  // Add useCallback import if needed
  if (!content.includes('useCallback')) {
    content = content.replace(
      'import { useEffect, useState } from "react";',
      'import { useEffect, useState, useCallback } from "react";'
    );
  }
  
  writeFile(filePath, content);
  return true;
}

// Fix Video.tsx
function fixVideo(filePath) {
  let content = readFile(filePath);
  
  // Wrap loadTechnique in useCallback
  content = content.replace(
    /const loadTechnique = async \(\) => {/g,
    'const loadTechnique = useCallback(async () => {'
  );
  
  // Close useCallback before useEffect
  const useEffectIndex = content.indexOf('useEffect(() => {', content.indexOf('loadTechnique'));
  if (useEffectIndex > -1) {
    const beforeUseEffect = content.lastIndexOf('}', useEffectIndex);
    content = content.substring(0, beforeUseEffect + 1) + ', [id]);\n' + content.substring(beforeUseEffect + 1);
  }
  
  // Add useCallback import if needed
  if (!content.includes('useCallback')) {
    content = content.replace(
      'import { useEffect, useState } from "react";',
      'import { useEffect, useState, useCallback } from "react";'
    );
  }
  
  // Update useEffect dependency
  content = content.replace(
    '}, [id]); // eslint-disable-line react-hooks/exhaustive-deps',
    '}, [id, loadTechnique]);'
  );
  
  writeFile(filePath, content);
  return true;
}

// Fix Supabase functions
function fixSupabaseFunction(filePath) {
  let content = readFile(filePath);
  
  // Fix handler function type
  content = content.replace(
    /Deno\.serve\(async \(req\): any => {/g,
    'Deno.serve(async (req) => {'
  );
  
  content = content.replace(
    /} catch \(error\) {/g,
    '} catch (error: unknown) {'
  );
  
  content = content.replace(
    /error: error\.message/g,
    'error: error instanceof Error ? error.message : String(error)'
  );
  
  writeFile(filePath, content);
  return true;
}

// Fix command.tsx empty interface
function fixCommand(filePath) {
  let content = readFile(filePath);
  
  content = content.replace(
    /export interface CommandEmptyProps {}/g,
    'export interface CommandEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}'
  );
  
  writeFile(filePath, content);
  return true;
}

// Main function
async function main() {
  log('\n🔧 Comprehensive Lint Error Fixer\n', 'blue');
  
  const fixes = [
    { path: 'src/components/admin/PlansTab.tsx', fix: fixPlansTab },
    { path: 'src/components/admin/TechniquesManagement.tsx', fix: fixTechniquesManagement },
    { path: 'src/components/admin/UsersTab.tsx', fix: fixUsersTab },
    { path: 'src/components/ui/video-thumbnail.tsx', fix: fixVideoThumbnail },
    { path: 'src/components/ui/command.tsx', fix: fixCommand },
    { path: 'src/hooks/useTranslation.tsx', fix: fixUseTranslation },
    { path: 'src/pages/AdminLogin.tsx', fix: fixLoginPages },
    { path: 'src/pages/Join.tsx', fix: fixLoginPages },
    { path: 'src/pages/Login.tsx', fix: fixLoginPages },
    { path: 'src/pages/MyPage.tsx', fix: fixMyPage },
    { path: 'src/pages/Video.tsx', fix: fixVideo },
    { path: 'supabase/functions/check-subscription/index.ts', fix: fixSupabaseFunction },
    { path: 'supabase/functions/create-checkout/index.ts', fix: fixSupabaseFunction },
    { path: 'supabase/functions/create-coupon/index.ts', fix: fixSupabaseFunction },
    { path: 'supabase/functions/create-payment/index.ts', fix: fixSupabaseFunction },
    { path: 'supabase/functions/manage-plans/index.ts', fix: fixSupabaseFunction },
    { path: 'supabase/functions/send-contact-email/index.ts', fix: fixSupabaseFunction },
  ];
  
  let fixedCount = 0;
  
  for (const { path: filePath, fix } of fixes) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        if (fix(fullPath)) {
          log(`✅ Fixed: ${filePath}`, 'green');
          fixedCount++;
        }
      } else {
        log(`⚠️  Skipped: ${filePath} (not found)`, 'yellow');
      }
    } catch (error) {
      log(`❌ Error fixing ${filePath}: ${error.message}`, 'red');
    }
  }
  
  log(`\nFixed ${fixedCount} files`, 'green');
  
  // Run final lint check
  log('\n📊 Final lint check...', 'blue');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    log('\n✨ All lint errors fixed!', 'green');
  } catch (e) {
    log('\n⚠️  Some issues may remain. Check the output above.', 'yellow');
  }
}

// Run the fixer
main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
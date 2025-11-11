
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

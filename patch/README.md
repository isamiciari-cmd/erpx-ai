# ERPX-AI V2 UI Foundation Patch

This is an **additive UI foundation patch** designed for the current ERPX-AI codebase. It does not replace business logic, Supabase services, RBAC, POS, inventory, finance, or the existing ExecutiveDashboard implementation.

## Included
- Responsive desktop/tablet/mobile application shell
- Collapsible desktop sidebar
- Mobile navigation drawer + bottom navigation
- Global command palette (`Ctrl/Cmd + K`)
- AI command button
- Theme-aware V2 visual tokens
- Smooth page transitions with reduced-motion support
- Responsive spacing and touch-friendly controls

## Files
- `src/app/layout/MainLayout.tsx`
- `src/app/layout/Sidebar.tsx`
- `src/app/layout/Topbar.tsx`
- `src/app/design-system/v2/tokens.ts`
- `src/styles/erpx-v2.css`
- `src/main.tsx` (only adds the V2 stylesheet import)

## Apply
Copy these files into the current project. **Do not replace `src/styles/theme.css` or `ThemeContext.tsx`.**

Do not replace `ExecutiveDashboard.tsx` yet. The next step is the dashboard V2 redesign, where we will preserve the current dashboard's real data/services/actions and change only its presentation.

## Validate in the user's project
```powershell
pnpm exec tsc --noEmit
pnpm build
```

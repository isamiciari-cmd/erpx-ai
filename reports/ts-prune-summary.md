# ts-prune Audit — Initial Automated Cross-check

Date: 2026-09-02

Scope: Automated cross-check of all exported symbols reported by `ts-prune` (initial pass). This audit uses static grep searches across `src/**`, plus checks for duplicates, barrel/index exports, and common dynamic patterns (lazy imports, default exports).

Summary (concise)

- Total entries processed: all symbols output by `npx ts-prune --project tsconfig.prune.json` (report saved at `reports/ts-prune-audit.csv`).
- High-confidence SAFE_TO_REMOVE (no external references):
  - `src/components/LoadingState.tsx:LoadingSpinner` — Duplicate spinner; app uses `src/app/components/ui/LoadingSpinner`.
  - `src/hooks/useCurrentUserRole.ts:useCurrentUserRole` — No imports found outside the file.
- Realtime exports (`src/lib/realtime.ts`) — flagged as LIKELY_UNUSED / POSSIBLE_DYNAMIC_USAGE. They are defined and referenced internally but show no external import sites; need developer review because these may be intended for runtime wiring or dynamic imports.
- Many other ts-prune flags are false positives: widely-used pages, hooks, services, types, and default exports are reported by ts-prune but are imported/used elsewhere (often via barrels, route trees, lazy imports, or UI index files). Those are labeled FALSE_POSITIVE / INTENTIONAL_EXPORT in the CSV.

Key findings (requested deep checks)

- `src/hooks/useCurrentUserRole.ts`
  - Classification: SAFE_TO_REMOVE
  - Confidence: High
  - Evidence: No imports outside the defining file; ts-prune flagged it, grep finds only its definition.
  - Recommended action: developer review; remove or consolidate if redundant.

- `src/components/LoadingState.tsx` (the `LoadingSpinner` function)
  - Classification: SAFE_TO_REMOVE
  - Confidence: High
  - Evidence: App imports `LoadingSpinner` from `src/app/components/ui/LoadingSpinner.tsx` (barrel `src/app/components/ui/index.ts`); the `LoadingSpinner` in `src/components/LoadingState.tsx` appears unused.
  - Recommended action: consider removing this duplicate; update docs if referenced.

- `src/lib/realtime.ts` exports (`useRealtimeSubscription`, `useInventoryRealtime`, `useNotificationsRealtime`, `realtimeManager`)
  - Classification: LIKELY_UNUSED / POSSIBLE_DYNAMIC_USAGE
  - Confidence: Medium
  - Evidence: Exports are implemented and referenced internally; grep shows no external import sites across `src/**`. Comments indicate intended external use (example import `@/lib/realtime`), but static search showed none.
  - Recommended action: Manually scan runtime code and any integration tests or consumer packages that may import this module dynamically. If not used, remove after confirming.

Next steps (no changes will be made without your approval)

1. Review the CSV at `reports/ts-prune-audit.csv` for per-symbol details and statements of evidence.
2. Decide whether to: (a) allow me to prepare a patch that removes only the `SAFE_TO_REMOVE` items (I will run build/tests after), or (b) request expansion of the audit to include additional dynamic detection heuristics (analyze route lazy-loads, regex search for string-based imports, analyze Vite chunking config references).

Files added

- `reports/ts-prune-audit.csv` — full per-symbol rows (file,symbol,line,classification,confidence,evidence,recommended_action).
- `reports/ts-prune-summary.md` — concise summary (this file).

I stopped after producing the report files. Tell me if you want me to (A) prepare a safe cleanup patch for the high-confidence items, (B) expand the audit to search for string-based/dynamic references and analyze Vite chunking, or (C) run the build/tests after hypothetical removals in a sandbox branch. (No source modifications will be made until you explicitly approve.)

---
name: opencode
description: Project-specific workflow for OpenCode in the Epsilon Scheduling repository. Use when implementing changes, debugging issues, or reviewing code in this codebase.
---

# OpenCode Workflow

Use this skill for tasks in the Epsilon Scheduling System repository.

## Required Safety Checks

1. Read `.agent/rules/rules.md` before editing code.
2. Never modify production attendance sync components without explicit user approval:
   - `set-upx3/`
   - `app/api/sync-attendance/`
   - `app/api/attendance-analytics/`
3. Preserve RBAC and Supabase RLS behavior in authentication and settings flows.

## Execution Checklist

1. Identify the affected feature module under `app/lib/features/` and related API routes.
2. Keep changes scoped to the requested behavior and avoid unrelated refactors.
3. Add or update validation and permission checks for API mutations.
4. Run relevant checks:
   - `npm run lint`
   - `npm run test:ci` (or targeted tests for small changes)
   - `npm run build` for release-ready changes
5. Summarize changed files, risk areas, and verification steps.

## Implementation Preferences

- Follow existing TypeScript and Next.js App Router conventions.
- Reuse shared utilities in `app/lib/utils/` and common UI in `components/ui/`.
- Log meaningful errors on server-side code paths.
- Prefer root-cause fixes over one-off patches.

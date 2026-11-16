# Claude Agent Instructions

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

## AI Code Generation Guardrails

These rules are mandatory because this repo already shows recurring weak-agent patterns: scratch files in the repo root, hardcoded Supabase credentials in one-off scripts, overly broad RLS fixes, heavy `any` usage, raw `console.*` logging, duplicated patch logic, and oversized files that grew through repeated edits. Future agents must treat those patterns as debt to avoid, not precedent to copy.

### 1. Read Before Writing
- Search the surrounding module, shared hooks, DTOs, logger helpers, migrations, and sibling features before editing.
- Do not copy an existing weak pattern just because it already exists. Existing `any`, raw `console.*`, scratch scripts, or broad SQL policies are not approval to add more.
- If a file is already large or fragile, prefer a small extraction over another in-place patch pile.

### 2. Repo Hygiene
- Never create root-level scratch artifacts such as `fix*.js`, `check*.js`, `probe*.mjs`, `temp*.txt`, `tsc_*.txt`, `*_result.txt`, or similar one-off files.
- Durable automation belongs in `scripts/`. Durable tests belong in the project test structure. One-off probes must be deleted before finishing the task.
- If you need diagnostics for verification, summarize the result in `tasks/todo.md` instead of committing raw output dumps.

### 3. Secrets and Environment Discipline
- Never hardcode Supabase URLs, anon keys, service keys, JWTs, passwords, emails, or other credentials in code, scripts, migrations, or markdown.
- Use environment variables for all secrets and external service configuration.
- Keep `.env.example` aligned with any new required environment variable.
- Never leave manual verification credentials, seeded PHI, or user-specific data in scripts.

### 4. SQL, Supabase, and RLS Rules
- Never add blanket write-access policies such as `Allow all access` or any `INSERT`/`UPDATE`/`DELETE` policy that effectively grants unrestricted authenticated access.
- `USING (true)` is only acceptable for explicitly non-sensitive, read-only reference tables and only for `SELECT`, with a comment explaining why the table is safe to expose and how it matches sibling catalogue tables.
- Any write policy must scope access by role, facility, ownership, workflow state, or another explicit business rule.
- Before adding a migration, compare policy changes with existing sibling tables and check for regressions in security posture.

### 5. Type Discipline
- Do not introduce new `any`, `as any`, `Record<string, any>`, or wide unsafe casts unless the boundary is truly dynamic and the reason is documented inline.
- Prefer explicit DTOs, discriminated unions, schema-driven parsing, and narrow helper types at the boundary where data enters the app.
- Never use `@ts-ignore` to end a task. Fix the type, isolate the unsafe boundary, or document the exact limitation with the narrowest possible `@ts-expect-error`.
- If an existing area is full of unsafe casts, do not add more without first checking whether a shared type can remove them.

### 6. Logging and Observability
- Do not add raw `console.log`, `console.warn`, `console.error`, or `console.debug` in app code when an existing logger or observability utility already exists.
- Prefer the shared renderer logger and main-process logging utilities, and include module context in every log.
- Redact secrets and PHI from logs. Debug logs are temporary and must be removed or downgraded before the task is considered done.
- If you touch an area already using raw console logging, do not copy the pattern forward.

### 7. Duplication and File Growth
- Do not solve a problem by copying normalization, mapping, validation, or query logic into a second or third location.
- If logic appears twice, extract a helper or shared utility.
- Avoid growing known hotspot files without questioning whether the change belongs in a smaller module.
- Large files are a warning sign. If a file is already hard to reason about, leave it more modular than you found it.

### 8. Verification and Test Discipline
- Never stop at "this should work." Prove the change with the narrowest relevant verification: diagnostics, tests, a targeted manual flow, or a SQL check.
- Ad hoc verification scripts are not a substitute for durable tests. If a script is worth keeping, move it into a maintained location and name it clearly.
- Do not commit raw verification logs or temporary test harnesses as task output.
- When verification is incomplete, say exactly what was and was not proven.

### 9. UI and Domain Safety
- Do not ship placeholder text, fake fallback data, hardcoded demo values, or “temporary” UX logic in production paths.
- Preserve clinical/business rules when refactoring. A UI fix is not complete if it weakens permissions, data integrity, billing behavior, or patient-safety checks.
- Guard data shape mismatches at the boundary instead of spreading null checks and unsafe casts deep through the UI.

### 10. Done Criteria For Any Agent Task
- No new root-level scratch or output artifacts.
- No hardcoded credentials or personal verification data.
- No new blanket RLS/write-access shortcuts.
- No new raw console logging, silent lint suppressions, or unnecessary type escapes.
- No duplicated logic added without a strong reason.
- Verification results are captured, and any remaining gaps are stated plainly.

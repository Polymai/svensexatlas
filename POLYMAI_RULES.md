# POLYMAI_RULES

## Core
- Read the full repository before making changes.
- Treat the current ChangePlan as a new task. Do not rely on previous Codex chat context.
- Follow the ChangePlan exactly and keep changes tightly scoped to the requested goal.

## Execution
- Inspect the listed focus files first, then read any direct dependencies needed to complete the task coherently.
- Keep the existing app structure unless the ChangePlan explicitly allows structure changes.
- Do not make unrelated edits, cleanup, or stylistic rewrites.
- Preserve working behavior unless the ChangePlan explicitly asks to replace it.

## Registry
- Always update registry.json in the same task so it matches the final repository reality.
- If files, responsibilities, entrypoints, mounts, or data-access ownership change, reflect that in registry.json immediately.
- If registry.json is missing or stale, recreate or repair it to match the actual repository after your edits.

## Safety
- If the ChangePlan conflicts with the repository, inspect the codebase and follow repository reality while still satisfying the goal.
- If a requested structure change would require broader redesign than the ChangePlan allows, stop and explain the blocker instead of improvising a larger rewrite.

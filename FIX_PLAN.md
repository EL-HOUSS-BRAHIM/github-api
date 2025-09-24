# Remediation Plan

## Phase 1 – Consolidated Quality Push (single execution log)

1. **Repository hygiene and developer experience**
   - Delete committed `node_modules` directories from both services and add service-specific `.gitignore` rules plus a root `.gitignore` to prevent re-introduction.
   - Add npm/yarn scripts for installing, linting, and testing both backend and frontend from the repository root to streamline onboarding.
   - Introduce Husky + lint-staged or equivalent lightweight pre-commit hooks to enforce formatting/linting on staged files.

2. **Backend resilience and maintainability**
   - Refactor `src/services/github.js` into smaller modules (`httpClient`, `rateLimiter`, `transformers`) and deduplicate logic such as `getUserRepos`.
   - Centralize environment configuration using a schema validator (e.g., `joi` or `zod`) to ensure required variables are present and supply sane defaults for optional ones.
   - Implement robust token rotation with exponential backoff and clear logging when the token pool is exhausted.
   - Replace wildcard Redis deletions with cursor-based scanning helpers that guard against accidental cache flushes.

3. **Data correctness and queue reliability**
   - Persist follower counts, repo totals, and timestamps with each ranking snapshot, and use stored values for staleness checks before enqueueing refresh jobs.
   - Harden Bull queue initialization: clean stalled jobs, add repeatable job metrics, and expose a lightweight health endpoint reporting queue depth and worker status.
   - Write integration coverage for the ranking refresh flow to ensure queues, cache invalidation, and API responses stay in sync.

4. **Frontend polish and UX alignment**
   - Convert the search experience into a real `<form>` with keyboard submission, inline validation, and non-blocking notifications instead of `alert`.
   - Update components to consume the refined backend DTOs (rankings, repositories, activity), add skeleton states, and surface queue progress/estimated completion.
   - Audit routing in `App.jsx` to remove unused imports, ensure deep links are supported, and add error boundaries around data-heavy routes.

5. **Quality gates and documentation**
   - Expand Jest/Supertest suites to cover profile, repository, and activity endpoints, plus add React Testing Library coverage for the refreshed UI flows.
   - Configure CI (GitHub Actions) to run lint, test, and build steps for both backend and frontend on every push/PR.
   - Refresh the README with environment variable tables, architecture diagrams, queue/Redis expectations, and troubleshooting steps so new contributors ramp quickly.

This single-phase remediation log delivers hygiene, stability, user experience, and test depth upgrades aimed at raising the project rating to at least 8/10.

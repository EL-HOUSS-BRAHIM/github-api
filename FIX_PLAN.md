# Remediation Plan

This project has a solid ingestion pipeline and UI shell, but production issues span configuration, GitHub API usage, data modeling, caching and front-end/back-end contracts. The plan below is organized to tackle the highest-risk bugs first and then deliver feature parity between the services and UI.

## Phase 1 – Stabilize the backend
1. **Configuration hardening**
   - Provide safe defaults for optional environment variables and guard required ones with helpful error messages.
   - Allow the API to boot without TLS-only database/Redis settings so local development works out of the box.
2. **GitHub client reliability**
   - Rotate tokens on every request (not just module load) and recover gracefully from missing token pools.
   - Tighten rate-limit handling so requests are retried with the next token or fail fast with context.
3. **Ranking data correctness**
   - Persist follower and public repository counts with each ranking snapshot and use those values in the “should update” check.
   - Import the GitHub service where needed and ensure ranking updates no longer throw due to missing fields.
4. **Cache invalidation fixes**
   - Replace wildcard `redisClient.del` usage with a helper that scans keys by pattern before deleting them.

## Phase 2 – Align API contracts with UI needs
5. **Repository DTO parity**
   - Expose only the fields we actually capture (stars, forks, issues, topics, last commit, commit totals) and update the React components to match.
   - Extend persistence if additional metrics (license, size, language) are required.
6. **Ranking endpoint & UI integration**
   - Return a consistent ranking response (global rank, country rank, score, totals) from the backend.
   - Update the front-end ranking component to fetch real data and show loading/error states.
7. **Activity aggregates**
   - Provide aggregate stats (total contributions, current streak) or adjust the UI to visualize the time-series that exists today.

## Phase 3 – Polish & documentation
8. **Environment documentation**
   - Document required env vars, defaults, and sample `.env` files for local development.
9. **Testing coverage**
   - Add integration tests that exercise the ranking refresh flow and API contracts.
10. **UX follow-ups**
    - Hook up About/Contact navigation, improve loading states, and surface refresh progress to users.

We start executing Phase 1 in this iteration to unblock local reliability and repair the ranking pipeline, then move into Phase 2 for API/UI alignment.

# Part 1 – Environments, digital twin, AI agent

## Environments
| Env | Git branch | Hosting | Database | Purpose |
|---|---|---|---|---|
| Development | `dev` | preview deploy of `dev` | local `data/twin.db` or Turso `portal-dev` | AI agent + developers change things here |
| Testing (digital twin) | `test` | preview deploy of `test` | Turso `portal-twin` (anonymised copy of live) | Safe replica; smoke-tested |
| Live | `main` | production | Turso `portal-live` | Real users |

Flow: `dev` → (CI green) → `test` → (smoke test green + **human approval via the GitHub `live` environment**) → `main`.

## Digital twin
`npm run twin:sync` copies live users/uploads into the twin DB with **emails anonymised** (`student1@twin.test` …) and refuses to run if twin = live. `npm run twin:dev` runs the portal on :3100 against the twin.

## AI agent (OpenAI)
`.github/workflows/agent-maintenance.yml` runs weekly (Sunday 18:00 UTC) and on demand. It checks out `dev` and runs `agent/run.mjs`, which calls the OpenAI API with a small tool set (list/read/write files, and a fixed list of npm commands: typecheck, lint, test, build, audit, outdated, update). It cannot touch `.github/`, `.env*`, `data/users.json`, or its own instructions. After the agent finishes, an **independent gate** re-checks forbidden paths and re-runs typecheck, lint, tests and build. Green → commit to `dev` → auto-promote to `test`. Live needs one approval click. The agent's report appears in the run's Summary page.

**Send a comment to the AI:** GitHub → Actions → "AI maintenance agent" → Run workflow → type the problem in the `feedback` box (works from the GitHub mobile app too). The agent fixes it on `dev`, the gate runs, and the report is in the run summary.

## One-time setup
1. `git checkout -b dev && git push -u origin dev && git checkout -b test && git push -u origin test`.
2. GitHub → Settings → Secrets and variables → Actions: secret `OPENAI_API_KEY`; optional variable `OPENAI_MODEL` (default `gpt-4.1`); variables `TEST_URL`, `LIVE_URL`.
3. GitHub → Settings → Environments: create `testing` and `live` (add yourself as required reviewer on `live`).
4. Host: set the production branch to `main`; give the Preview/`test` environment its own Turso DB.
5. Recommended: branch protection on `main` requiring CI.

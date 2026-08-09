# AGENTS.md

## Cursor Cloud specific instructions

This is a **Vite + React 19 + TypeScript** single-page app (`travel-planner`) managed with **npm**. It is frontend-only; there is no in-repo backend. Standard commands live in `package.json` and `README.md` — use those as the source of truth.

### Services

| Service | Command | Notes |
|---|---|---|
| Frontend dev server (the product) | `npm run dev` | Vite, serves on `http://localhost:5173/`. This is the whole app. |

### Key notes (non-obvious)

- The update script already runs `npm install`, so dependencies are ready on startup — no need to reinstall.
- **Supabase is optional.** Without valid `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`), the app automatically falls back to a fully local, single-device experience seeded from `src/data/seed.ts` (`localStorage`). This is enough to run and test core features (calendar, add/edit events, notes, etc.). Cloud-only features (shared edit/view links, realtime multi-device sync, multi-trip list, "what-if" clones, trip create/delete) require a real Supabase project **with the 5 `travel_*` tables created manually** — there are no migration/schema files in the repo.
- Lint (`npm run lint`, oxlint) currently emits a few warnings (fast-refresh / exhaustive-deps) but exits 0. These are pre-existing, not errors.
- `npm run build` runs `tsc -b && vite build`; the large-chunk (>500 kB) warning is expected and not a failure.

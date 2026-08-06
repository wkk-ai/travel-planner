# Travel Planner

Google Calendar–style trip itinerary for the **BigBang US Trip 2026** (Aug 29 – Sep 7, 2026).

Live (after Pages deploy): https://wkk-ai.github.io/travel-planner/

## Features

- Week + Day calendar with drag-and-drop
- Secret **edit** and **view-only** links (no login)
- Live sync via Supabase Realtime + offline queue
- Pre-loaded trip from the spreadsheet
- Flights, notes, checklist, budget, maps links, weather
- Image / PDF export, expenses CSV
- Running late, travel-buffer warnings, where-now highlight
- Photo pins, duplicate day, confirmation import, what-if copy, trip recap
- Undo + haptic feedback on move

## Develop

```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_* if needed
npm run dev
```

## Build / Pages

```bash
npm run build
```

GitHub Actions deploys `dist/` to Pages on push to `main`.

Set repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Links

- Edit: `/#/e/<edit_token>`
- View: `/#/v/<view_token>`

First visit creates a trip and seeds events automatically.

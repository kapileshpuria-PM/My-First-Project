# Pocket FM EU Deals Tracker

Working preview app for EU deal tracking, closed-deal commercial terms, and payment calculations.

## Run Locally

```bash
python3 server.py
```

Open:

```text
http://127.0.0.1:5173/
```

Useful routes:

- `/#live`
- `/#closed`
- `/#payments`

## What Is Included

- Live Deals, Closed Deals, Benchmarks, and Payments Calculation UI.
- Entity / IP repository search flow with local app data and bundled SCOUT data fallback.
- Local JSON-backed API in `server.py` for repository snapshots and Google Sheet CSV import.
- Payments upload flow for:
  - IP ID x Show ID x Show Type
  - monthly data dump for revenue, spends, and column J final mastered hours

## Local Google Sheet Setup

Copy the example config:

```bash
cp backend/sheet_config.example.json backend/sheet_config.json
```

Then fill in the Sheet URL, gid/tab, and header row. `backend/sheet_config.json` is intentionally ignored so private or editable Sheet links are not committed.

You can also use environment variables:

- `GOOGLE_SHEET_URL`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_GID`
- `GOOGLE_SHEET_TAB`
- `GOOGLE_SHEET_HEADER_ROW`

## Supabase Production Setup

Run the schema in Supabase SQL Editor:

```sql
-- copy/paste supabase/schema.sql
```

Then add these Vercel Environment Variables for Production:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `GOOGLE_SHEET_URL`
- `GOOGLE_SHEET_HEADER_ROW`

For the current source sheet, `GOOGLE_SHEET_HEADER_ROW` should be `2` because the first row is a warning row and the real headers start on row 2.

The Vercel API routes then become the app backend:

- `GET /api/repository/search`
- `POST /api/repository/snapshot`
- `POST /api/deals`
- `GET /api/sheet/reload`
- `GET /api/sheet/status`
- `GET /api/health`

`/api/sheet/reload` is also scheduled through Vercel Cron at `0 3 * * *` UTC every day. The sync upserts changed rows, inserts new rows, and marks rows missing from the live sheet as inactive instead of deleting them.

## Deploy Notes

The current app is a no-build static frontend with Vercel serverless API routes for production and a small Python local preview server.

For a quick Vercel demo:

- Deploy the repo as a static site.
- The app will open and use bundled/local demo data until the Supabase env vars and schema are configured.
- Persistent repository search and live Google Sheet sync run through Supabase/serverless endpoints.

For the seamless production workflow, Supabase should become the source of truth for entities, IPs, deals, payment terms, show mappings, and monthly metrics.

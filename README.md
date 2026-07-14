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

## Deploy Notes

The current app is a no-build static frontend with a small Python local preview server.

For a quick Vercel demo:

- Deploy the repo as a static site.
- The app will open and use bundled/local demo data.
- Persistent DB and live Google Sheet sync should be wired next through Supabase/serverless endpoints.

For the seamless production workflow, Supabase should become the source of truth for entities, IPs, deals, payment terms, show mappings, and monthly metrics.

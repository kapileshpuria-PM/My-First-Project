# QA demo package (payments + closed deals)

Shared closed deals for the live app, plus the two upload files for Payments Calculation.

## What is included

- 8 Executed closed deals (H.Y. Hanna, Juliane Maibach, Moa Graven, Ambleside, Apub, Agent Peter Molden, Fakriro, Ullstein)
- `mapping.csv` (file 1 for Payments)
- `dump.csv` (file 2 for Payments)
- `Test-Cases-Index.md` (expected Final Payout per IP)

## After this ships to Vercel

1. Open the live site Closed Deals. You should see the 8 Executed deals (hard refresh / Reset data if an old browser cache is stuck).
2. Go to Payments Calculation.
3. Upload `mapping.csv` then `dump.csv` from this folder.
4. Pick publisher + IP. Numbers should match `Test-Cases-Index.md`.

## DB note

Closed deals are also upserted into Supabase `deals` (payload JSON). The app hydrates shared deals from `GET /api/deals` on load, and still seeds them via `seed.js` (`demoPaymentSeed`) as a fallback.

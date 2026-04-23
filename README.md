# 🍽️ Family Meal OS

Your family's kitchen command center. A mobile-first PWA for two adults and two toddlers to plan meals, manage shopping, track recipes, and decide on takeout.

## What it does

- 📅 **Weekly meal planning** — plan lunch & dinner for each day, swap meals, mark leftovers
- 📖 **Recipe library** — add recipes with ingredients, steps, nutrition, and kid notes
- 🛒 **Shopping list** — grouped by store (Target, Walmart, BJ's, Amazon), syncs in real time
- 🎲 **Takeout randomizer** — spin to pick a restaurant, veto options, logs history
- 🥫 **Pantry tracking** — know what you have, get expiry warnings
- 🧒 **Kid food log** — track new foods tried and acceptance ratings
- ⚡ **Real-time sync** — both phones see changes instantly via Supabase

## Running locally

```bash
# 1. Clone the repo
git clone <repo-url>
cd Family-Meal-App-

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Start the dev server
npm run dev
# Opens at http://localhost:5173
```

## Supabase setup

1. Go to https://app.supabase.com → New Project
2. Copy your **Project URL** and **anon public key** into `.env`
3. Go to **SQL Editor** → New Query → paste the contents of `supabase-schema.sql` → Run
4. That creates all 14 tables with proper indexes and RLS policies

## Deploying to Vercel

1. Push this repo to GitHub
2. Go to https://vercel.com → New Project → import the repo
3. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Deploy — Vercel auto-detects Vite

## Your wife joining on her phone

1. Open the Vercel URL on her phone
2. Tap **"Join with a family code"**
3. Enter the 6-character code (e.g., `BEAR42`) from your phone
4. She's in — same data, real-time sync

## Installing to home screen (iOS)

1. Open the app in Safari
2. Tap the Share button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap Add — done!

On Android: tap the browser menu → "Add to Home Screen" or "Install app"

## Tech stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Postgres + real-time subscriptions)
- **State**: React Query (server) + Zustand (local)
- **Auth**: Family code system (no accounts needed)
- **Hosting**: Vercel
- **Cost**: $0/month (both free tiers)

## Recovering your family code

If you forget the code, go to Supabase dashboard → Table Editor → `families` table → find your row → copy the `code` column value.

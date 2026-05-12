# Keto Tracker

A mobile-friendly web app for tracking net carbs and body weight on a ketogenic diet. Built with Next.js, Neon Postgres, and Claude for AI-assisted food logging.

## Features

- **Dashboard** with daily net-carb progress ring, 30-day weight sparkline, and 7-day carb-intake history
- **Four ways to log food**
  - Search (OpenFoodFacts autocomplete, millions of products)
  - Barcode scan (phone camera, ZXing in browser)
  - Photo (Claude vision estimates each item)
  - Natural language ("three eggs and half an avocado")
- **Weight log** with detailed line chart and trend delta on its own page
- **Research-grounded color coding** (green/yellow/red, see below)
- **Configurable daily goal** (default 20g) and lb/kg unit
- **PWA-installable** — add to home screen on iOS/Android for a full-screen app
- **Dark mode** follows system preference

## The green/yellow/red logic

| Color | Threshold | Interpretation |
|---|---|---|
| 🟢 Green | `consumed ≤ goal` | At/under your daily goal |
| 🟡 Yellow | `goal < consumed ≤ 50g` | Over goal but likely still in nutritional ketosis |
| 🔴 Red | `consumed > 50g` | Above the nutritional-ketosis ceiling for most adults |

The 50g cap comes from Volek & Phinney (*The Art and Science of Low-Carbohydrate Living*, 2011), which defines the upper bound of sustained nutritional ketosis (BHB 0.5–3.0 mmol/L) at ~50g net carbs/day for healthy adults. Below 20g/day is the "strict" threshold used by the Modified Atkins Diet for epilepsy (Kossoff et al., 2003) and most therapeutic protocols.

If you raise your goal above 50g (lazy keto), yellow collapses — going over goal becomes red immediately, since you're already past the literature ceiling.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **Neon Postgres** via Drizzle ORM (HTTP driver for edge-friendly serverless queries)
- **Anthropic SDK** (Claude Sonnet 4.6) for photo + text food parsing, with tool-use schemas for structured output
- **OpenFoodFacts** free API for barcode lookup + search autocomplete
- **ZXing** for in-browser barcode scanning via the phone's rear camera
- **Recharts** for the weight chart

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure env vars

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL=postgres://...           # pooled, from Neon dashboard
DATABASE_URL_UNPOOLED=postgres://...  # non-pooled, used for migrations
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Create the database tables

```bash
npm run db:push
```

This reads [`lib/db/schema.ts`](lib/db/schema.ts) and applies it to your Neon database.

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

> **Heads-up for Claude Code users**: this CLI exports an empty `ANTHROPIC_API_KEY` into the shell, which overrides `.env.local`. If the AI features say "AI not configured," run `unset ANTHROPIC_API_KEY && npm run dev`. A normal Terminal window doesn't have this problem.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. In your Vercel project → **Storage** → create a new Neon Postgres database.
4. Settings → **Environment Variables** — add `ANTHROPIC_API_KEY`. (`DATABASE_URL` and `DATABASE_URL_UNPOOLED` are auto-injected by the Neon integration.)
5. Deploy.
6. After first deploy, run `npm run db:push` locally with `DATABASE_URL_UNPOOLED` pointed at the production database to create the tables.

## Install on phone

Open the deployed URL on your phone → Share → **Add to Home Screen**. The app runs full-screen with no browser chrome, and the barcode scanner works directly from the home-screen icon.

## Notes on accuracy

- **Photo and natural-language parsing are estimates.** Vision models guess portion sizes; correct them in the review list before tapping **Log all**.
- **OpenFoodFacts data is crowdsourced.** Brand names and serving sizes can vary by region. Cross-check the label if a number looks off.
- **Net carbs** = total carbohydrates − fiber − sugar alcohols − allulose. Erythritol, allulose, and other polyols are subtracted in full (the standard keto convention) for OpenFoodFacts data, AI-parsed entries, and the "From label" manual entry calculator. Manual "Net carbs" direct entry assumes the user has already done their own subtraction.

## Roadmap

- Streak counter for days under goal
- "My foods" cache so frequent items skip the API roundtrip
- CSV export
- Optional auth (Clerk or Vercel) for multi-device sync with different users

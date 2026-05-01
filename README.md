# Budget 2026

A personal/household budget tracker — monthly check register + envelope hybrid, with carry-forward, business mileage, and a real loan-snowball projector.

Replaces the spreadsheet template with a desktop web app. Single-household, manual entry, browser-local data.

## Quickstart

```bash
npm install
npm run dev          # local dev server at http://localhost:5173
npm test             # run snowball + carry-forward unit tests
npm run build        # production build → dist/
```

## Deploy to Netlify (single command)

You need the Netlify CLI logged in once:

```bash
npm install -g netlify-cli
netlify login
netlify init         # link this folder to a Netlify site (one time)
```

Then to deploy:

```bash
npm run deploy
```

This runs `npm run build && netlify deploy --prod --dir=dist`.

For a draft / preview deploy without `--prod`:

```bash
npm run build && netlify deploy --dir=dist
```

The `netlify.toml` already configures the build command and SPA redirect, so dragging `dist/` into the Netlify dashboard also works as a fallback.

## Architecture

```
src/
  types.ts            # domain types
  store/index.ts      # Zustand store + persist (localStorage)
  lib/
    seed.ts           # initial state factory + defaults
    dates.ts          # month-key helpers
    money.ts          # parse/format
    compute.ts        # derived totals (computeMonthTotals, etc)
    carryForward.ts   # closeMonth / reopenMonth
    snowball.ts       # projection math (snowball/avalanche/custom)
    exportImport.ts   # JSON I/O
  components/
    Sidebar.tsx       # nav + month list
    Dashboard.tsx     # year overview
    MonthView.tsx     # main monthly work surface
    LoansView.tsx     # snowball planner
    SettingsView.tsx  # globals, lists, export/import
    IncomeCard.tsx
    CreditsCard.tsx
    BillsCard.tsx
    CategoriesCard.tsx
    MileageCard.tsx
    ui/               # primitives
```

## Data model

- **Months** — 12 per year, each with status `planning` → `active` → `closed`.
- **Budgets are snapshotted into each month** when seeded, so editing a global default doesn't retro-edit historical months.
- **Closing a month** runs `closeMonth()`:
  1. Sets status = closed, computes `closingBalance` from actuals.
  2. Computes unspent envelope total = sum of `(budget - spent)` per bill + per category, clamped at zero.
  3. Adds a `carryForward` credit to the next month equal to that unspent amount.
  4. Sets next month's `openingBalance` = closing balance.
  5. Replicates bill / category / income budgets forward if the next month is still in `planning`.
- **Reopening** rolls all of that back.

## Persistence

- All state lives in `localStorage` under key `budget-2026-state`.
- **Export JSON** regularly from Settings → Data. There is no server backup.
- **Import JSON** restores any exported file.
- **Reset all data** wipes localStorage and reseeds defaults.

## Snowball math

`projectPayoff(loans, config)` walks month-by-month. Each month:

1. Interest accrues on all active loan balances at `apr / 12`.
2. Every loan receives its minimum payment.
3. Extra money (configured `extraMonthly` + rolled-forward minimums of paid-off loans, when `rollPaidPaymentsForward = true`) is directed at the priority loan.
4. When that loan hits zero, remaining extra in the same month spills onto the next priority.

Strategies:
- `snowball` — smallest balance first
- `avalanche` — highest APR first
- `custom` — explicit ordering (`config.customOrder`)

Hard cap of 600 months prevents runaway projections when minimums don't cover interest. The UI surfaces an `insufficientPayment` warning in that case.

## Carry-forward semantics

The carry-forward credit added on month-close reflects **unspent envelope budget** (what was budgeted but not spent), not raw cash leftover. Cash leftover is captured separately via the `openingBalance` rollover. This lets you see at a glance: "of what I planned to spend, $X was preserved."

If you want pure cash-leftover semantics instead, edit `closeMonth` in `src/lib/carryForward.ts` — it's a single change.

## Tests

```bash
npm test
```

Covers snowball ordering, payoff math (zero-interest, with-interest, rolling forward, avalanche prioritization, max-month cap) and carry-forward (close, unspent calculation, reopen rollback). 17 tests.

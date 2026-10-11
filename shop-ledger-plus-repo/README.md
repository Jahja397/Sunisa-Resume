# 🏪 Shop Ledger Plus

🇬🇧 **English** · [🇹🇭 ภาษาไทย](README.th.md)

An **income / expense / profit-and-loss tracker for small shops and street vendors**, with extra tools
for stock, pricing, break-even, credit records and sales goals.
Plain **HTML + CSS + JavaScript — no build step, no dependencies.** Open `index.html` and it works.
Thai and English UI, dark mode, mobile friendly (checked from 320 px to 1280 px wide).

## ✨ Features

**Home page**
- Profit, income and expenses for **Today · This month · This year**, compared with the previous period
  (shows "no data" instead of a fake ↑100% when there is nothing to compare with)
- Bar or line charts: this week (Mon–Sun), every day of a month (any month/year can be browsed — the chart only),
  or 12 months; tap or drag to read the numbers; Y-axis values included
- Summary donut: expenses and profit as a **percentage of income**, profit margin in the centre
- Add, **edit** and delete entries. Input is strict: no negatives, no letters, nothing above 100 million,
  no future dates; Thai digits and thousands separators are accepted (`1,250`, `๓๐๐`)
- Two ways to start: **sample data** (a 6-week chicken-rice shop) or **enter everything yourself**
  (guided 5 steps: products → income → expenses → credit → goal)

**Extras (🧰) — 8 tabs, each with its own dashboard**

| Tab | What it does |
|---|---|
| 📦 Stock | Add / edit / delete products; **sell** (deducts stock and records income), **sell on credit**, restock (records the expense); low-stock and out-of-stock alerts |
| 🧮 Cost & price | Cost per piece and a suggested selling price for a target margin |
| ⚖️ Break-even | Units needed per month / per day, revenue-vs-cost chart |
| 🏆 Best / worst sellers | Ranking, revenue share, revenue vs profit, trend, best weekday |
| 🤝 Credit | Receivables and payables, overdue / due-soon, **partial payments**, editable records |
| 🎯 Goal | Monthly sales goal, progress, month-end forecast, required daily sales |
| 🩺 Data check | Finds leftover or orphaned records and typed entries that are not linked to a product (can be linked afterwards) |
| 💾 Backup / Sync | Sample data, reset, `.json` backup, **transfer code**, cross-device sync (Claude runtime only) |

**Data integrity**
- Sales, restocks and debt payments are **linked to ledger entries**. Deleting one updates every page
  (stock is restored, paid amounts are reduced, …) after a confirmation window that lists exactly what will happen.
- Deleting a **product** removes only the product — past sales, ledger entries and profit stay unchanged.
- **Credit sales** deduct stock and create a receivable but record income only when the customer actually pays
  (cash-basis accounting).
- Goal and break-even figures count **sales income only** (not debt repayments from non-credit debts, not "other income").
- The app can stay open overnight: "today" refreshes itself at midnight.
- Every import, reset or sync change keeps one **undo** copy.

## 🚀 Getting started

```bash
# option 1: just double-click index.html
# option 2: serve it locally
npx serve .          # then open http://localhost:3000
```

Data lives in the browser's **localStorage** — there is no server and nothing is sent anywhere.

### One single file (for emailing or submitting)
```bash
node tools/build-single.js     # -> dist/shop-ledger-single.html, opens by double-click
```

### Online demo with GitHub Pages
Settings → Pages → *Deploy from a branch* → `main` / root, then open the generated link (https is needed for clipboard access).

## 🧪 Tests
```bash
pip install playwright && playwright install chromium
python3 tests/smoke_test.py                               # tests index.html
python3 tests/smoke_test.py dist/shop-ledger-single.html  # tests the bundled file
```
The 25 checks run in real Chromium: sample data on every page, sell/delete keeps stock in sync,
deleting a product keeps history, product and entry editing, negative numbers and future dates rejected,
credit sales and partial payments, backup download → import round trip, the guided wizard, Esc key,
theme persistence, language switch, typed text surviving background sync retries, and no JavaScript errors.

## 🗂 Project structure
```
index.html                 page markup only
css/style.css              all styles (business blue/gold theme, dark mode, responsive)
js/                        scripts, loaded in numeric order (see docs/ARCHITECTURE.md)
  01-config-i18n.js        language, default categories, Thai/English dictionary
  02-state-utils.js        ledger state, formatting helpers, "today" getter
  03-main-view.js          home page: KPIs, donut, charts, entry list, add form
  04-chart-lang-month.js   chart tooltips, month/year picker, applyLang()
  05-extras-core.js        extras state, strict number parser, tabs, navigation
  06-extras-actions.js     stock, cost, break-even, credit and goal actions
  07-extras-views.js       renderers for each extras tab
  08-dashboards.js         per-tab dashboards, cascade deletes, data check
  09-typed-sale-link.js    typed income that matches a product, "link to product"
  10-demo-data.js          sample data (tagged so it can be cleared)
  11-start-modes.js        reset, 5-step "enter my own data" wizard, start chooser
  12-cloud-sync.js         cross-device sync (Claude runtime only)
  13-backup-files.js       .json backup, import, transfer code
  14-recover-boot.js       recovery prompt, app boot, midnight refresh
  15-edit-entries.js       edit ledger entries, Esc key
  16-credit.js             credit sales, partial payments, edit debts
  legacy/                  disabled Excel/PDF export (not loaded)
tools/build-single.js      bundle everything into one HTML file
tests/smoke_test.py        end-to-end test (Playwright + Chromium)
docs/ARCHITECTURE.md       code and data-model notes (Thai)
README.md  README.th.md    this file in English / Thai
```

## 🔐 Privacy and data
- Everything is stored in **your browser's localStorage** (keys: `ledger`, `plus`, `lang`, `theme`, …).
  Clearing the browser data **deletes the shop data** — use the backup file or transfer code.
- Data, backup files and transfer codes are **not encrypted**.
- There is no login. Anyone using the same browser profile sees the same data.

## ⚠️ Limitations
- **No multi-user sharing.** Each browser has its own data. Sharing one set of books between an owner and staff needs a real backend
  (for example Firebase Auth + Firestore), which is not part of this repository.
- **Cross-device sync only works inside Claude** (it uses `window.claude` database + user APIs, tied to the signed-in Claude account
  and requiring write permission). From a file or GitHub Pages the sync buttons report that sync is unavailable;
  everything else works. Use the backup file or the transfer code to move data between devices.
- Choosing **"merge"** when two devices conflict can bring back entries that were deleted on one of them.
- Excel/PDF export is disabled (see `js/legacy/README.md`).
- Tested in desktop Chromium and a simulated phone viewport. Real iPhone/Safari and the real Claude sync backend have **not** been tested.

## 📄 License
Not set yet — add a `LICENSE` file before making the repository public.

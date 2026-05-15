# BonTip — Project Summary & Handoff

## App Info
| | |
|---|---|
| **App name** | BonTip |
| **Live URL** | https://bontip.app |
| **Backup URL** | https://bontip-deploy.vercel.app |
| **GitHub** | https://github.com/ofirnavonspec/bontip |
| **Vercel project** | bontip-deploy (ofirnavonspec team) |
| **Domain registrar** | Namecheap — bontip.app (~$14/yr, auto-renew on) |
| **Google Analytics** | G-0MHRME6R5T |
| **Google Search Console** | bontip.app (domain property, verified) |

---

## What This Is
A mobile-first web app combining a **tip calculator with bill splitter** and a **live currency converter**.
Target audience: people at restaurants, especially travelers comparing currencies.
Monetization: Google AdSense (display ads). Simple, high-repeat-use utility = good ad revenue potential.

---

## Tech Stack
- **React** (functional components + hooks)
- **Vite** as the build tool
- **No external UI libraries** — all styling is inline React styles
- **Frankfurter API** (free, no key needed) for live currency rates: `https://api.frankfurter.dev/v1/`
- Font: **Plus Jakarta Sans** from Google Fonts
- **PWA** — installable on Android and iPhone via "Add to Home Screen"

---

## Project Structure

```
tip_app/
├── index.html           ← HTML entry point, meta tags, Analytics, PWA manifest link
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx         ← React entry point
│   └── App.jsx          ← All app code (components, logic, styles)
└── public/
    ├── favicon.svg      ← App icon (BT monogram, purple/pink gradient)
    ├── icon-192.svg     ← PWA icon
    ├── icon-512.svg     ← PWA icon
    ├── manifest.json    ← PWA manifest
    ├── sw.js            ← Service worker (offline caching)
    └── sitemap.xml      ← SEO sitemap submitted to Google
```

---

## Local Development
```bash
npm install
npm run dev        # local dev server at localhost:5173
npm run build      # production build → dist/ folder
```

---

## Deployment
- **Host**: Vercel (free Hobby plan)
- **Auto-deploy**: every `git push` to `main` triggers a new Vercel deployment
- **DNS**: Namecheap Advanced DNS has:
  - `A Record` @ → `216.198.79.1`
  - `CNAME Record` www → `0a7f381edca2ce27.vercel-dns-017.com.`

To deploy a change:
```bash
git add .
git commit -m "describe your change"
git push
```
Vercel deploys in ~1 minute automatically.

---

## Features Built

### Tab 1: Split Calculator
- **Bill amount** input
- **Tip presets**: 10% (default), 12%, 15%, 18%, 20%, 25% — each with its own color
- **Custom tip %** input
- **People counter** (1–12)
- **Equal split**: cent-fair distribution (e.g. $100 ÷ 3 = $33.34, $33.33, $33.33)
- **Custom split** with two modes per person:
  - `%` mode: percentage of remainder (not total, when fixed people exist)
  - `$` mode: fixed amount with sub-toggle:
    - "TOTAL INCL. TIP" — fixed amount includes tip
    - "BILL ONLY + TIP" — fixed bill amount, tip added proportionally on top
- Auto-rebalance when adding/removing people
- Neighbor rebalance when adjusting percentages
- Per-person breakdown: total, bill portion, tip portion (useful for cash tip)
- Currency selector (10 currencies, affects all displayed amounts)
- "Add to Home Screen" install button with browser-specific instructions

### Tab 2: Currency Converter
- Live rates via Frankfurter API (no API key needed)
- Shows error + retry button if API fails (no stale fallback rates)
- 10 currencies: USD, EUR, GBP, ILS, CAD, AUD, JPY, MXN, CHF, INR
- Tap any result row to flip the conversion base currency
- Refresh button

---

## Design System
- **Background**: deep purple gradient `#1a1035 → #2d1b69`
- **Cards**: white `#ffffff` with shadow
- **Accent colors**: pink `#FF6B9D`, purple `#9B5DE5`, blue `#00BBF9`, orange `#FF6B35`
- **Per-person colors**: pink, purple, blue, orange, teal, yellow
- **Font**: Plus Jakarta Sans (Google Fonts)
- **Border radius**: 16–24px throughout
- **Animations**: floating plate emoji, button press scale

---

## SEO
- Meta description and title reference BonTip by name
- Keywords in 18 languages (EN, FR, DE, ES, IT, NL, PT, JA, KO, AR, HE, ZH, HI, TH, ID, RU, PL, TR)
- Open Graph tags for social sharing previews
- Sitemap at https://bontip.app/sitemap.xml (submitted to Google Search Console)
- Google Analytics tracking (G-0MHRME6R5T)

---

## PWA (Progressive Web App)
- Users can install via "Add to Home Screen" button in the app
- Android/Chrome: native install prompt or browser menu
- iPhone/Safari: Share → Add to Home Screen
- Firefox: browser menu → Add to Home Screen
- Service worker caches the app for offline use
- App icon: BT monogram on dark purple background

---

## Monetization (Google AdSense — pending)
- Apply at google.com/adsense once traffic reaches ~20+ visits/day
- Once approved, paste the AdSense `<script>` tag into `index.html`
- Best ad placements: below tip result, sticky bottom banner on mobile

---

## Future Ideas
- Welcome/onboarding tour for new users
- More currencies (Frankfurter API supports ~30)
- Hebrew name translator + Gematria calculator
- Salary ↔ hourly converter
- Age difference / days until calculator
- Recipe unit converter (cups → grams per ingredient)
- Loan payoff accelerator
- Timezone meeting planner

Each follows the same pattern: Vite + React, deploy to Vercel, monetize with AdSense.

---

## Files
| File | Description |
|------|-------------|
| `src/App.jsx` | All app code — components, logic, styles |
| `index.html` | HTML shell — Analytics, PWA tags, meta/SEO |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker |
| `public/sitemap.xml` | SEO sitemap |
| `tip-calculator-v7.jsx` | Original source file (superseded by src/App.jsx) |
| `PROJECT.md` | This document |

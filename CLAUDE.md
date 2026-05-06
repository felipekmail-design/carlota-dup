# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Carlota DUP is a personal fitness tracking Progressive Web App (PWA) for a Daily Undulating Periodization (DUP) strength program. All content is in Brazilian Portuguese. The app is used by two athletes: **Felipe** (with left epicondylitis/elbow injury constraints) and **Julia** (no injury constraints).

There is no build system, no package manager, and no framework. Each file is a fully self-contained single HTML file with inline CSS and JavaScript.

## Files

| File | Purpose |
|---|---|
| `Carlota_DUP.html` | Main workout tracker — Felipe's version |
| `Carlota_DUP_Julia.html` | Main workout tracker — Julia's version (green header, no elbow warnings) |
| `carlota_checkin.html` | Daily check-in form (sleep, HRV, nutrition) → Google Sheets |
| `carlota_warmup.html` | Pre-workout warmup tracker with per-exercise timers → Google Sheets |

## Development

Open any HTML file directly in a browser — no server needed. To iterate quickly:
- Use browser DevTools with mobile emulation (iPhone, max-width 480px)
- `localStorage` stores all workout history; clear it via DevTools → Application → Local Storage to reset state

## Architecture of `Carlota_DUP.html` / `Carlota_DUP_Julia.html`

### Data

The `WK[]` array at the top of the `<script>` block is the single source of truth for workout definitions. Each entry has:
- `id` — used as the `localStorage` key for session history (`ss_PUSH-A`, etc.)
- `zc` — hex color for the current zone; injected as CSS custom property `--zc`
- `ex[]` — exercises, where `p:1` means "priority" (red left border) and `a` is an alert string for Felipe's injury constraints

### Storage (localStorage)

| Key | Content |
|---|---|
| `dup_p` | Array of weekly bioimpedance check-in entries |
| `dup_h` | Today's HRV/heart rate/sleep object |
| `ss_{WK_ID}` | Array of up to 4 past sessions for each workout (FIFO, newest first) |
| `seed_v1` | Flag so the Google Calendar seed data runs only once |

### CSS Naming Convention

Classes use heavily abbreviated single/double-letter names (e.g. `.ec` = exercise card, `.etb` = exercise toggle button, `.sndb` = send button). This is intentional — do not rename them. The `--zc` CSS variable drives all accent colors and changes per active workout tab.

### Rendering

The entire DOM is built at runtime inside the `(function build(){...})()` IIFE at the bottom of the script. There is no static HTML for the tabs or exercise cards — they are constructed by iterating `WK[]`. The Progress tab's content is re-rendered each time by `renderProg()`.

## Felipe vs Julia Differences

- **Header**: Felipe has a solid `#111` header; Julia has a green gradient (`#064e3b → #047857`)
- **Elbow warnings**: Exercises with `a` field show a `⚠️` alert panel. Julia's file omits these entirely from `WK[]`
- **`carlota_warmup.html`**: A single file supports both users via a toggle. The `.user-julia` CSS class (set on `#app-root`) hides all `.alert-cotovelo` and `.cotovelo-field` elements for Julia
- **Seed data**: Felipe's `Carlota_DUP.html` has pre-seeded session history from Google Calendar (PULL-B and LEGS-B from April 2026). Julia's file has no seed data

## External Integrations

Both `carlota_checkin.html` and `carlota_warmup.html` POST JSON to Google Apps Script endpoints. The requests use `Content-Type: text/plain` (not `application/json`) to avoid CORS preflight — this is intentional. The endpoints write to a Google Sheets database called "Carlota DUP - Database".

- Check-in endpoint: hardcoded `SCRIPT_URL` constant in `carlota_checkin.html`
- Warmup endpoint: hardcoded `APPS_SCRIPT_URL` constant in `carlota_warmup.html`

`Carlota_DUP.html` does not use Apps Script — it sends workout summaries via a Gmail compose deep-link to `felipekmail@gmail.com`.

## Workout Program Structure

Six sessions following DUP principles, cycling through three intensity zones:
- **FORÇA** (red, `#dc2626`) — 4–6 reps, strength focus
- **HIPERTROFIA** (blue, `#2563eb`) — 8–15 reps, hypertrophy focus
- **METABÓLICO** (amber, `#d97706`) — 15–20 reps, metabolic/conditioning focus

PUSH A = Força, PUSH B = Hipertrofia, PULL A = Hipertrofia, PULL B = Força, LEGS A = Metabólico, LEGS B = Hipertrofia.

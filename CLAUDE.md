# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, no-build vanilla JS/HTML/CSS app for Forza Horizon 6 that rolls a random race (car type, class, race type, track), browses cars/tracks, and pins every track on the official FH6 map. `fh6-random-race-gen.html` is the entire app — HTML, CSS and JS all inline in one file, including a large baked-in JSON-like data blob (car list, track list, map pins). There is no package.json, no bundler, no test runner, and no lint config.

## Running / testing

There is no build step. Open `fh6-random-race-gen.html` directly in a browser (or via `index.html`, which just redirects to it). To preview changes in this session, use the built-in browser (`preview_start` with the file path) rather than a dev server — there's nothing to serve.

There are no automated tests. Verify changes by actually using the app in a browser: roll random races, search for a car, open the Track/Map panes, and check the browser console for errors.

## Deployment

`.github/workflows/deploy.yml` auto-deploys `index.html`, `fh6-random-race-gen.html` and `fh6-map.jpg` via FTPS to Turbify hosting whenever those files change on `master`. Pushing to `master` is effectively pushing to production — there's no staging environment. `.github/workflows/ftp-debug.yml` is a manual, workflow_dispatch-only helper for listing the FTP directory structure; it's not part of normal deploys.

Releases are also cut on GitHub (`gh release create`), bundling just `fh6-random-race-gen.html` + `fh6-map.jpg` into a zip so the app can be run fully offline. Use dot releases (e.g. v1.3.1) for small changes (UI tweaks, bug fixes); bump the middle number (e.g. v1.3.0 → v1.4.0) for new game data (cars/tracks from a new Series).

`APP_VERSION` near the top of the `<script>` in `fh6-random-race-gen.html` must be bumped by hand to match the release tag when cutting a release — there's no build step to inject it automatically.

## Data model and the CSV → HTML sync gotcha

**The most important thing to know in this codebase:** `forza_horizon_6_car_list.csv` is the human-edited source of truth for car data, but the live app reads from `TYPE_TO_CARS`, a separate JS object baked directly into `fh6-random-race-gen.html`. Editing the CSV alone does **not** update the app. Whenever cars change, both must be updated together, along with the human-readable mirror `fh6-car-types-to-cars.md`. The full procedure is documented in README.md under "Keeping the data up to date" — follow it exactly when adding/changing cars.

`TYPE_TO_CARS` is stored as one extremely long single line (tens of thousands of characters). The `Read` tool cannot load that line directly (it exceeds the token budget). To inspect or edit it: use `Bash`/Python to extract the relevant substring by type-group key, then use `Edit` with an exact substring match derived from that extraction — not from a `Read` of that line range.

Within each type group in `TYPE_TO_CARS` and in `fh6-car-types-to-cars.md`, cars are sorted alphabetically by Make, then Model. Keep new insertions in that order. Exact-duplicate CSV rows are counted/listed only once in both `TYPE_TO_CARS` and the markdown mirror, so the app's car count is one less than the raw CSV row count when such a duplicate exists.

**Never guess a car's Type or Class.** Only add these when sourced from the official FH6 car list (forza.net) or another authoritative source; if unknown, leave blank rather than guess.

## Key in-file data structures (`fh6-random-race-gen.html`)

All baked into the `<script>` block starting around line 994, roughly in this order:

- `TYPE_RACE_MAP` — which race types each car type suits.
- `TYPE_CLASSES` — which classes (D/C/B/A/S1/S2/R/X) each car type can race in.
- `TRACKS` — track names grouped by race type (Street, Road, Touge, Drag, Dirt, Cross Country, Drift Attack).
- `TRACK_LOCATIONS` — track → `{region, dir}`, used as a fallback for approximate map placement.
- `TYPE_GROUPS` — groups car types into Modern / Retro / Classic / Track & Racing / Offroad & Utility for the UI. A brand-new car type must be added here or it falls under "Other".
- `MAPMASTER_IDS` — track → external MapMaster location ID (not exhaustive).
- `BAKED_PINS` — track → `{x,y}` exact map coordinates (not exhaustive). A track missing from both this and `MAPMASTER_IDS` still works, just rendered as an "approximate" pin via `exactPin()`/`approxSpot()` using `TRACK_LOCATIONS`. Don't fabricate coordinates for a track you can't source — let it fall back.
- `TYPE_TO_CARS` — every car, grouped by type (see CSV sync note above). This is the one giant single-line object.
- `APP_VERSION` — manually bumped per release (see Deployment above).

User map-pin adjustments are stored in `localStorage` (`PIN_STORE_KEY`), not in the repo; there's a Back up/Restore pins flow for persisting them across browsers.

## Other files

- `README.md` — user-facing how-to and the authoritative "Keeping the data up to date" workflow; read it before touching car/track data.
- `fh6-car-types-to-cars.md` — generated/human-readable mirror of `TYPE_TO_CARS`, must stay in sync with it.
- `forza_horizon_6_car_list.csv` — master car data source (`Year,Make,Model,Type,TraditionalType,Class,Country`).
- `fh6-map.jpg` — official FH6 map image the app displays.
- `index.html` — redirect shim to `fh6-random-race-gen.html`, deployed alongside it.

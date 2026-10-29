# FH6 Tune Finder

Search a Forza Horizon 6 car and get back:

1. **Seeded tunes** — a small, hand-verified set of community share codes (car, class, discipline, tuner, upvotes) collected from [fh6tunes.app](https://fh6tunes.app/tunes) and [Forza Horizon Hub](https://forzahorizonhub.com/tunes).
2. **Live search results** — a real query against a search-engine API, scoped to tune-code sites, for whatever car you typed (including cars not in the seed set). A 9-digit share code is extracted from each result's title/snippet when one is present, but it's a pattern match on open web text — always verify against the linked page before using it in-game.

## Project layout

```
fh6-tune-finder/
  server/
    app.py               # stdlib-only HTTP server: static files + /api/seed + /api/search
    providers/
      google_cse.py       # Google Programmable Search (Custom Search JSON API) client
  data/
    seed_tunes.json       # hand-curated tune + car-spec dataset
  public/
    index.html, style.css, app.js   # frontend
  .env.example             # copy to .env and fill in your API credentials
```

## Setup

Requires Python 3.9+ only — no pip installs, no Node.

1. **Get a search API key** (free tier available):
   - Go to [Programmable Search Engine](https://programmablesearchengine.google.com/), create a search engine, turn on **"Search the entire web"**, and copy its **Search engine ID**.
   - Go to the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials), enable the **Custom Search API** on your project, and create an **API key**.
   - Google's free tier is 100 queries/day; beyond that it's billed per 1,000 queries. See Google's current pricing before relying on this for heavy use.

2. **Configure**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in `GOOGLE_API_KEY` and `GOOGLE_CSE_ID`.

3. **Run**:
   ```bash
   python server/app.py
   ```
   Open http://localhost:8000

If you skip step 1/2, the app still works — seeded tunes show normally, and the live-search panel reports that it isn't configured instead of failing silently.

Restart `python server/app.py` after editing `.env` — it's only read once at startup.

## Notes

- Live results are cached in-memory per query for 1 hour to avoid burning through the free query quota while you're testing.
- `TUNE_SITES` in `.env` controls which sites the live query is scoped to (`site:` operators); defaults to fh6tunes.app, forzahorizonhub.com, and r/ForzaHorizon.
- To add another search provider (e.g. Bing, SerpApi), add a module under `server/providers/` with the same `search(query, ...) -> list[dict]` shape as `google_cse.py` and wire it into `live_search()` in `server/app.py`.

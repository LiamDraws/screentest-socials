# Screentest Social Bot

Posts a daily branded puzzle card to Bluesky, X, and Threads automatically
via GitHub Actions — built around your real card API:

```
GET /api/public/card?game=<slug>&size=<size>&date=YYYY-MM-DD
```

## How it decides what to post

- **Which game**: rotates through all 9 slugs (`film, tv, anagram, timeline,
  poster, logline, boxoffice, faceoff, reviews`) one per day, deterministically
  by date — no state needed. Override with the `GAME_ROTATION` repo variable
  (comma-separated slugs) to feature a subset or a fixed order.
- **Which size**: each platform gets a sensible default — `landscape` for
  Bluesky and X, `portrait` for Threads (matches Instagram/Threads' 4:5 feed
  format). Override per-platform with `BLUESKY_CARD_SIZE`, `X_CARD_SIZE`,
  `THREADS_CARD_SIZE`.
- **Caption**: auto-generated ("New puzzle: Screentest {Game} is up") +
  link + hashtags. Edit `buildCaption()` in `src/cardImage.js` to change
  the wording.

## The SVG -> PNG problem, and how this handles it

Your API returns SVG. None of the three platforms accept SVG for image
posts, so the bot converts to PNG locally (via `sharp`) before posting.

For **Bluesky and X**, that's enough — both accept uploaded image bytes
directly.

For **Threads**, Meta's Graph API requires a *public image URL* rather
than uploaded bytes, and SVG isn't accepted either way. Since there's
nowhere public to host the converted PNG, the bot **commits each day's
PNG into this repo** (under `public-cards/`) and uses its
`raw.githubusercontent.com` URL. No extra hosting account, but two
things to know:

- The workflow needs `permissions: contents: write` (already set) so it
  can push these commits.
- `public-cards/` will accumulate one file per day. Fine for a long
  time, but you may want to periodically prune old ones, or later move
  to a dedicated orphan branch if it gets unwieldy.

**Better long-term fix**: if you ever add a `&format=png` option to your
card API, swap the Threads image source to that URL directly and delete
`src/publishPng.js` entirely — cleaner and avoids the repo growing.

## 1. Get API credentials per platform

**Bluesky** (easiest, free, do this first)
1. bsky.app -> Settings -> App Passwords -> Create one (NOT your login password)
2. You need: `BLUESKY_IDENTIFIER` (your handle) + `BLUESKY_APP_PASSWORD`

**X (Twitter)**
1. developer.x.com -> create a Project + App
2. Generate API Key/Secret and Access Token/Secret (Read+Write permissions)
3. You need: `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`
4. Note: X's 2026 pay-per-use pricing charges extra if post text contains
   a raw URL (~$0.20/post vs $0.015). The bot defaults to **omitting the
   link on X** for this reason (image + bio carry it instead) — set
   `X_INCLUDE_LINK=true` to include it anyway.

**Threads**
1. developers.facebook.com -> create an app -> add the Threads API product
2. Link a Threads professional account, generate a long-lived access
   token (Meta tokens expire — refresh roughly every 60 days)
3. You need: `THREADS_USER_ID`, `THREADS_ACCESS_TOKEN`

## 2. Add secrets/variables to GitHub

Repo -> Settings -> Secrets and variables -> Actions
- Add each credential above as a **Secret**
- Optionally add `SCREENTEST_SITE_URL` and `GAME_ROTATION` as **Variables**
  (not secret — just config, defaults are fine if you skip this)

## 3. Test locally before trusting the schedule

```bash
npm install
cp .env.example .env   # fill in real values
npm run post:dry-run   # prints what would be posted + card URLs, posts nothing
npm run post           # actually posts (also commits a card PNG for Threads)
```

Note: the repo-commit step for Threads only works inside GitHub Actions
(it needs `GITHUB_REPOSITORY`/git push access) — a local dry run will
show you the caption and card size but won't exercise that step.

## 4. Turn it on

Push to your repo with secrets configured — `.github/workflows/daily-post.yml`
runs daily at 13:00 UTC (adjust the cron to match when puzzles flip over).
Trigger a manual run anytime from the repo's Actions tab.

## Notes

- If one platform fails (expired token, rate limit), the others still
  post — failures don't block each other.
- Threads tokens expire periodically; if posts silently stop after a
  couple months, check that first.
- `story` size (1080x1920) is fetched by the API but not wired into any
  platform here — Stories posting generally isn't automatable via public
  APIs, so that size is best used manually via your `/cards` admin page.

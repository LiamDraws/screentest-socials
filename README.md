# Screentest Social Bot

Posts once a day: a 2-image post (spoiler-free **cover card**, then the
**combined answers card**) covering every puzzle from the previous day —
including the locked/paywalled one — to Bluesky, X, and Threads.

```
GET /api/public/card?kind=cover&size=<size>&date=YYYY-MM-DD
GET /api/public/card?kind=answers&size=<size>&date=YYYY-MM-DD
```

## How it works

- **One card per day, not per game.** The site now generates a single
  combined card covering all of that day's puzzles (Film + whichever
  other games were live, including the locked one), rather than a
  separate card per game. The bot fetches both the `cover` (spoiler-free,
  good as a lead image) and `answers` (the actual reveal) cards for
  **yesterday's** date, since the API only serves past answers.
- **Posted differently per platform, to give people a real choice about
  spoilers**:
  - **Threads**: posts just the **answers card**, flagged with Threads'
    native `is_spoiler_media` — the image shows blurred in the feed until
    the reader taps to reveal it. (A cover+answers carousel was tried
    first but hit a Threads permissions error; the single spoiler-tagged
    image turned out to be both simpler and a better fit for "let people
    choose to see it" anyway.)
  - **Bluesky and X**: post both the **cover card** (spoiler-free) and
    **answers card** as a 2-image post. Neither platform has a native
    spoiler-blur API (Bluesky's self-labels only cover NSFW categories;
    X's `possibly_sensitive` flag is the same story) — cover-then-answers
    is the closest available approximation, requiring a swipe/tap to see
    the second image rather than a true blur.
- **Size**: one `CARD_SIZE` setting applies to all platforms (default
  `square`, matching what the site's own `/cards` admin preview uses).
  Override with the `CARD_SIZE` repo variable if you want a different
  size (`portrait`, `story`, `landscape` should still work if the API
  supports them).
- **Caption**: generic across all games, since one post now covers
  everything ("Yesterday's Screentest answers, revealed" + link +
  hashtag). Edit `buildCaption()` in `src/cardImage.js` to change wording.

## The SVG -> PNG problem, and how this is handled

The card API returns SVG. None of the three platforms accept SVG for
image posts, so the bot converts both cards to PNG locally (via `sharp`)
before posting.

For **Bluesky and X**, that's enough — both accept uploaded image bytes
directly.

For **Threads**, Meta's Graph API requires public image *URLs* (not
uploaded bytes), and SVG isn't accepted either way. Since there's nowhere
public to host the converted PNGs, the bot **commits both PNGs into this
repo** (under `public-cards/`) each day and uses their
`raw.githubusercontent.com` URLs. This requires the repo to be **public**
(private repos block that URL from being fetched externally) and the
workflow to run with `permissions: contents: write` (already set).

`public-cards/` grows by 2 files/day — worth pruning periodically, or
moving to a dedicated branch if the repo gets large. **Better long-term
fix**: if the card API ever adds public PNG output directly, point
Threads at that URL instead and delete `src/publishPng.js` entirely.

## 1. Get API credentials per platform

**Bluesky** (easiest, free, do this first)
1. bsky.app -> Settings -> App Passwords -> Create one (NOT your login password)
2. You need: `BLUESKY_IDENTIFIER` (your handle) + `BLUESKY_APP_PASSWORD`

**X (Twitter)**
1. developer.x.com -> create a Project + App
2. Generate API Key/Secret and Access Token/Secret (Read+Write permissions,
   generated AFTER setting that permission level or they'll be read-only)
3. You need: `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`
4. X's 2026 pay-per-use pricing charges extra if post text contains a raw
   URL — the bot omits the link on X by default (image + bio carry it);
   set `X_INCLUDE_LINK=true` to include it anyway.

**Threads**
1. developers.facebook.com -> create an app -> add the Threads API product
2. Add yourself as a Threads Tester (Roles -> Threads Testers), approve
   from the Threads app if prompted
3. Use the app's built-in **User Token Generator** (under the Threads use
   case settings) to get a token directly — usually simpler than the
   manual OAuth redirect flow
4. You need: `THREADS_USER_ID` (from a `/me` call), `THREADS_ACCESS_TOKEN`

## 2. Add secrets/variables to GitHub

Repo -> Settings -> Secrets and variables -> Actions
- Add each credential above as a **Secret**
- Optionally add `SCREENTEST_SITE_URL` and `CARD_SIZE` as **Variables**
  (defaults are fine if you skip this)
- Make sure the repo itself is **public** (Settings -> Danger Zone ->
  Change visibility) — required for the Threads image-hosting trick above

## 3. Test locally before trusting the schedule

```bash
npm install
cp .env.example .env   # fill in real values
npm run post:dry-run   # prints the caption + both card URLs, posts nothing
npm run post           # actually posts (also commits 2 PNGs for Threads)
```

Note: the repo-commit step for Threads only works inside GitHub Actions
(needs `GITHUB_REPOSITORY`/git push access) — a local dry run won't
exercise that step.

## 4. Turn it on

Push to the repo with secrets configured — the workflow runs daily at
07:00 AEST (21:00 UTC) by default. Trigger a manual run anytime from the
Actions tab (no inputs needed now — always posts yesterday's combined
answers).

## Notes

- If one platform fails (expired token, rate limit), the others still
  post — failures don't block each other.
- Threads tokens expire periodically; if posts silently stop after a
  couple months, check that first.
- If a game+date combo was already committed to `public-cards/` from an
  earlier test run today, the bot detects there's nothing new to commit
  and just reuses the existing public URL instead of erroring.

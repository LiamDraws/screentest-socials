// All configuration is pulled from environment variables so nothing
// sensitive ever lives in the repo. In GitHub Actions these come from
// repository Secrets/Variables (Settings -> Secrets and variables -> Actions).

export const config = {
  siteBaseUrl: process.env.SCREENTEST_SITE_URL || "https://www.screentest.au",

  // The card API is now date-only (one combined card per day covering
  // every game live that day, including locked/paywalled ones) — no more
  // per-game rotation needed. Size applies to both the cover and answers
  // cards for a given platform.
  cardSize: process.env.CARD_SIZE || "square",

  // If true, prints what WOULD be posted instead of actually posting.
  // Run with `npm run post:dry-run` or set DRY_RUN=true.
  dryRun: process.env.DRY_RUN === "true",

  bluesky: {
    enabled: process.env.BLUESKY_ENABLED !== "false",
    identifier: process.env.BLUESKY_IDENTIFIER, // e.g. screentestgames.bsky.social
    appPassword: process.env.BLUESKY_APP_PASSWORD, // bsky.app/settings/app-passwords — NOT your login password
  },

  x: {
    enabled: process.env.X_ENABLED !== "false",
    appKey: process.env.X_APP_KEY,
    appSecret: process.env.X_APP_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
    // X's 2026 pay-per-use pricing charges extra if the post text contains
    // a raw URL. Default to leaving it out (image + bio carry the link);
    // set X_INCLUDE_LINK=true to include it anyway.
    includeLink: process.env.X_INCLUDE_LINK === "true",
  },

  threads: {
    enabled: process.env.THREADS_ENABLED !== "false",
    userId: process.env.THREADS_USER_ID, // Threads/Instagram professional account ID
    accessToken: process.env.THREADS_ACCESS_TOKEN, // long-lived Meta access token
  },
};

// All configuration is pulled from environment variables so nothing
// sensitive ever lives in the repo. In GitHub Actions these come from
// repository Secrets/Variables (Settings -> Secrets and variables -> Actions).

// All slugs the API actually accepts (kept for validating GAME_SLUG env
// var overrides, e.g. if you want to manually test a beta game).
const ALL_GAME_SLUGS = [
  "film",
  "tv",
  "anagram",
  "timeline",
  "poster",
  "logline",
  "boxoffice",
  "faceoff",
  "reviews",
];

// Games currently live for auto-posting. `logline` (formerly "Redacted")
// and `reviews` are excluded while in beta — add them back here once
// they're out of beta.
const ACTIVE_GAME_SLUGS = ["film", "tv", "anagram", "timeline", "poster", "boxoffice", "faceoff"];

// Human-readable names for captions.
export const GAME_NAMES = {
  film: "Film",
  tv: "TV",
  anagram: "Anagram",
  timeline: "Timeline",
  poster: "Poster",
  logline: "Logline",
  boxoffice: "Box Office",
  faceoff: "Face Off",
  reviews: "Reviews",
};

export const ALL_GAME_SLUGS_EXPORT = ALL_GAME_SLUGS;

export const config = {
  siteBaseUrl: process.env.SCREENTEST_SITE_URL || "https://www.screentest.au",

  // Order games rotate through when no specific game is forced (see
  // GAME_SLUG below) — used as a fallback for manual/dry runs. Defaults
  // to active (non-beta) games only.
  gameRotation: (process.env.GAME_ROTATION
    ? process.env.GAME_ROTATION.split(",").map((s) => s.trim())
    : ACTIVE_GAME_SLUGS
  ).filter((slug) => ALL_GAME_SLUGS.includes(slug)),

  // When set, this run posts exactly this game instead of picking one via
  // rotation — used by the multi-slot daily schedule, where each of the
  // day's 9 scheduled runs is pinned to a specific game (see workflow).
  forcedGameSlug: ALL_GAME_SLUGS.includes(process.env.GAME_SLUG) ? process.env.GAME_SLUG : null,

  // If true, prints what WOULD be posted instead of actually posting.
  // Run with `npm run post:dry-run` or set DRY_RUN=true.
  dryRun: process.env.DRY_RUN === "true",

  bluesky: {
    enabled: process.env.BLUESKY_ENABLED !== "false",
    identifier: process.env.BLUESKY_IDENTIFIER, // e.g. screentestgames.bsky.social
    appPassword: process.env.BLUESKY_APP_PASSWORD, // bsky.app/settings/app-passwords — NOT your login password
    cardSize: process.env.BLUESKY_CARD_SIZE || "landscape", // square | portrait | story | landscape
  },

  x: {
    enabled: process.env.X_ENABLED !== "false",
    appKey: process.env.X_APP_KEY,
    appSecret: process.env.X_APP_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
    cardSize: process.env.X_CARD_SIZE || "landscape",
    // X's 2026 pay-per-use pricing charges extra if the post text contains
    // a raw URL. Default to leaving it out (image + bio carry the link);
    // set X_INCLUDE_LINK=true to include it anyway.
    includeLink: process.env.X_INCLUDE_LINK === "true",
  },

  threads: {
    enabled: process.env.THREADS_ENABLED !== "false",
    userId: process.env.THREADS_USER_ID, // Threads/Instagram professional account ID
    accessToken: process.env.THREADS_ACCESS_TOKEN, // long-lived Meta access token
    cardSize: process.env.THREADS_CARD_SIZE || "portrait", // Threads/IG feed favors 4:5
  },
};

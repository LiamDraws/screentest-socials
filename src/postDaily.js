import { config } from "./config.js";
import { getTodaysGame, todayString, getCardPng, buildCaption } from "./cardImage.js";
import { publishPngToRepo } from "./publishPng.js";
import { postToBluesky } from "./platforms/bluesky.js";
import { postToX } from "./platforms/x.js";
import { postToThreads } from "./platforms/threads.js";

async function main() {
  const date = todayString();
  const game = getTodaysGame();

  console.log(`Featured game for ${date}: ${game.name} (${game.slug})`);

  const [blueskyImage, xImage, threadsImage] = await Promise.all([
    config.bluesky.enabled ? getCardPng({ slug: game.slug, size: config.bluesky.cardSize, date }) : null,
    config.x.enabled ? getCardPng({ slug: game.slug, size: config.x.cardSize, date }) : null,
    config.threads.enabled ? getCardPng({ slug: game.slug, size: config.threads.cardSize, date }) : null,
  ]);

  const blueskyText = buildCaption(game, { includeLink: true });
  const xText = buildCaption(game, { includeLink: config.x.includeLink });
  const threadsText = buildCaption(game, { includeLink: true });

  console.log("--- Bluesky/Threads caption ---\n" + blueskyText);
  console.log("--- X caption ---\n" + xText);

  if (config.dryRun) {
    console.log("DRY RUN — not posting anywhere.");
    console.log("Card URLs:", {
      bluesky: blueskyImage?.sourceUrl,
      x: xImage?.sourceUrl,
      threads: threadsImage?.sourceUrl,
    });
    return;
  }

  // Threads needs a public PNG URL, not raw bytes and not SVG — commit
  // today's converted PNG into the repo so it gets a stable public
  // raw.githubusercontent.com URL, then give the CDN a moment to catch up.
  let threadsImageUrl = null;
  if (threadsImage) {
    const relativePath = `public-cards/${date}-${game.slug}-${config.threads.cardSize}.png`;
    threadsImageUrl = publishPngToRepo(threadsImage.buffer, relativePath);
    await new Promise((r) => setTimeout(r, 5000));
  }

  const results = await Promise.allSettled([
    postToBluesky({ text: blueskyText, image: blueskyImage }),
    postToX({ text: xText, image: xImage }),
    postToThreads({ text: threadsText, imageUrl: threadsImageUrl }),
  ]);

  const platforms = ["Bluesky", "X", "Threads"];
  let hadFailure = false;

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      const r = result.value;
      console.log(r.skipped ? `${platforms[i]}: skipped (${r.reason})` : `${platforms[i]}: posted ✅`);
    } else {
      hadFailure = true;
      console.error(`${platforms[i]}: FAILED —`, result.reason?.message || result.reason);
    }
  });

  if (hadFailure) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});

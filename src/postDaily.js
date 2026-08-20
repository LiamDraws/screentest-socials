import { config } from "./config.js";
import { yesterdayAest, getCardPng, buildCaption } from "./cardImage.js";
import { publishPngToRepo } from "./publishPng.js";
import { postToBluesky } from "./platforms/bluesky.js";
import { postToX } from "./platforms/x.js";
import { postToThreads } from "./platforms/threads.js";

async function main() {
  // The card API only serves past dates for answers (today's stays
  // unspoiled) — the bot always posts yesterday's combined reveal.
  const date = yesterdayAest();
  console.log(`Posting combined answers for ${date}`);

  const [coverPng, answersPng] = await Promise.all([
    getCardPng({ kind: "cover", size: config.cardSize, date }),
    getCardPng({ kind: "answers", size: config.cardSize, date }),
  ]);

  const blueskyText = buildCaption({ includeLink: true });
  const xText = buildCaption({ includeLink: config.x.includeLink });
  const threadsText = buildCaption({ includeLink: true });

  console.log("--- Caption ---\n" + blueskyText);

  if (config.dryRun) {
    console.log("DRY RUN — not posting anywhere.");
    console.log("Cover URL:", coverPng.sourceUrl);
    console.log("Answers URL:", answersPng.sourceUrl);
    return;
  }

  // Threads needs public image URLs, not raw bytes — commit both PNGs
  // into the repo so they get public raw.githubusercontent.com URLs.
  let threadsImageUrls = [];
  if (config.threads.enabled) {
    const coverPath = `public-cards/${date}-cover-${config.cardSize}.png`;
    const answersPath = `public-cards/${date}-answers-${config.cardSize}.png`;
    const coverUrl = publishPngToRepo(coverPng.buffer, coverPath);
    const answersUrl = publishPngToRepo(answersPng.buffer, answersPath);
    threadsImageUrls = [coverUrl, answersUrl];
    // Give raw.githubusercontent.com's CDN a moment to catch up.
    await new Promise((r) => setTimeout(r, 5000));
  }

  const results = await Promise.allSettled([
    postToBluesky({ text: blueskyText, images: [coverPng, answersPng] }),
    postToX({ text: xText, images: [coverPng, answersPng] }),
    postToThreads({ text: threadsText, imageUrls: threadsImageUrls }),
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

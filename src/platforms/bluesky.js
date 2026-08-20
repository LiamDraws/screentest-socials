import { AtpAgent, RichText } from "@atproto/api";
import { config } from "../config.js";

/** images: array of {buffer, contentType, alt} — cover card first, then answers card. */
export async function postToBluesky({ text, images }) {
  if (!config.bluesky.enabled) return { skipped: true, reason: "disabled" };
  if (!config.bluesky.identifier || !config.bluesky.appPassword) {
    throw new Error("Missing BLUESKY_IDENTIFIER or BLUESKY_APP_PASSWORD env vars.");
  }

  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({
    identifier: config.bluesky.identifier,
    password: config.bluesky.appPassword,
  });

  // RichText auto-detects links/hashtags so they render as clickable facets.
  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  const record = {
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  };

  if (images?.length) {
    const uploaded = await Promise.all(
      images.map((img) => agent.uploadBlob(img.buffer, { encoding: img.contentType }))
    );
    record.embed = {
      $type: "app.bsky.embed.images",
      images: uploaded.map((u, i) => ({
        image: u.data.blob,
        alt: images[i].alt || "Screentest daily puzzle card",
      })),
    };
  }

  const result = await agent.post(record);
  return { skipped: false, uri: result.uri };
}

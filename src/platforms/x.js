import { TwitterApi } from "twitter-api-v2";
import { config } from "../config.js";

export async function postToX({ text, image }) {
  if (!config.x.enabled) return { skipped: true, reason: "disabled" };
  const { appKey, appSecret, accessToken, accessSecret } = config.x;
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error("Missing one of X_APP_KEY / X_APP_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET.");
  }

  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });
  const rw = client.readWrite;

  let mediaIds;
  if (image) {
    const mediaId = await rw.v1.uploadMedia(image.buffer, { mimeType: image.contentType });
    mediaIds = [mediaId];
  }

  // Note: X's pay-per-use pricing (2026) charges per post, and more if the
  // post text contains a URL. Since the link is already visible in the
  // branded share card image, consider omitting the raw URL from `text`
  // for X specifically to keep costs down — see README for details.
  const result = await rw.v2.tweet({
    text,
    ...(mediaIds ? { media: { media_ids: mediaIds } } : {}),
  });

  return { skipped: false, id: result.data.id };
}

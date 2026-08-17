import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Threads' Graph API requires a public image URL (not uploaded bytes,
 * and not SVG). Since the card API only serves SVG, we convert to PNG
 * (see cardImage.js) and commit that PNG into this repo so GitHub gives
 * it a stable public URL at raw.githubusercontent.com — no extra
 * hosting account needed.
 *
 * Requires the workflow to run with `permissions: contents: write` and
 * actions/checkout's default credential persistence (already set up in
 * .github/workflows/daily-post.yml).
 */
export function publishPngToRepo(buffer, relativePath) {
  mkdirSync(dirname(relativePath), { recursive: true });
  writeFileSync(relativePath, buffer);

  const run = (cmd) => execSync(cmd, { stdio: "pipe" }).toString();

  try {
    run(`git config user.name "screentest-social-bot"`);
    run(`git config user.email "actions@users.noreply.github.com"`);
    run(`git add "${relativePath}"`);

    // If this exact file (same game/date/size) was already committed —
    // e.g. from an earlier test run today — there's nothing new to
    // commit. That's not an error: the file (and its public URL) already
    // exist, so just skip straight to returning the URL.
    const staged = run(`git diff --cached --name-only`).trim();
    if (staged) {
      run(`git commit -m "Daily social card: ${relativePath}"`);
      run(`git push`);
    }
  } catch (err) {
    throw new Error(
      `Failed to commit/push card image to repo — check the workflow has ` +
        `"permissions: contents: write". Original error: ${err.message}`
    );
  }

  const repo = process.env.GITHUB_REPOSITORY; // "owner/repo", set automatically in Actions
  const branch = process.env.GITHUB_REF_NAME || "main";
  if (!repo) {
    throw new Error("GITHUB_REPOSITORY env var not set — this only works inside GitHub Actions.");
  }

  return `https://raw.githubusercontent.com/${repo}/${branch}/${relativePath}`;
}

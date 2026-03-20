/**
 * Publish approved drafts to X.
 *
 * Scans the drafts folder for files with **Status:** Approved,
 * posts them to X, and marks them as Published.
 *
 * Workflow:
 *   1. `npm run draft` — generates drafts
 *   2. Edit drafts, change status to "Approved"
 *   3. `npm run publish` — posts approved drafts to X
 *
 * Usage:
 *   npm run publish                          # publish today's approved drafts
 *   npm run publish -- --date 2026-03-20     # publish a specific date's drafts
 *   npm run publish -- --dry-run             # preview what would be posted
 */

import "dotenv/config";
import { getApprovedDrafts, markAsPublished } from "./approval.js";
import { createXClient, postTweet, postThread } from "./publishers/x.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const today = new Date().toISOString().split("T")[0];
  const options = { date: today, dryRun: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      options.date = args[i + 1];
      i++;
    }
    if (args[i] === "--dry-run") {
      options.dryRun = true;
    }
  }

  return options;
}

function validateEnv() {
  const required = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error("\nSee SETUP-X-API.md for setup instructions.");
    process.exit(1);
  }
}

/**
 * Detects if content is a thread (multiple tweets separated by ---).
 */
function parseContent(content) {
  const parts = content.split(/\n---\n/).map((p) => p.trim()).filter(Boolean);

  if (parts.length > 1) {
    return { type: "thread", tweets: parts };
  }

  return { type: "single", text: content };
}

async function main() {
  const options = parseArgs();

  console.log("\n=== Publish to X ===");
  console.log(`Date: ${options.date}`);
  if (options.dryRun) console.log("(DRY RUN — will preview but not post)\n");

  validateEnv();

  const dateDir = `drafts/${options.date}`;
  const approved = getApprovedDrafts(dateDir);

  // Filter to X posts only
  const xPosts = approved.filter((d) => d.platform === "x");

  if (xPosts.length === 0) {
    console.log("\nNo approved X drafts found.");
    console.log(`\nTo approve a draft, edit the file in ${dateDir}/ and change:`);
    console.log('  **Status:** Draft  →  **Status:** Approved');
    return;
  }

  console.log(`\nFound ${xPosts.length} approved X post(s) to publish.\n`);

  const client = options.dryRun
    ? null
    : createXClient({
        appKey: process.env.X_API_KEY,
        appSecret: process.env.X_API_SECRET,
        accessToken: process.env.X_ACCESS_TOKEN,
        accessSecret: process.env.X_ACCESS_SECRET,
      });

  let posted = 0;
  let failed = 0;

  for (const draft of xPosts) {
    console.log(`--- "${draft.topic}" ---`);

    const parsed = parseContent(draft.content);

    if (options.dryRun) {
      if (parsed.type === "thread") {
        console.log(`  Type: Thread (${parsed.tweets.length} tweets)`);
        parsed.tweets.forEach((t, i) => console.log(`  [${i + 1}] ${t.slice(0, 80)}...`));
      } else {
        console.log(`  Type: Single tweet`);
        console.log(`  ${parsed.text.slice(0, 140)}...`);
      }
      console.log();
      posted++;
      continue;
    }

    try {
      let result;
      if (parsed.type === "thread") {
        console.log(`  Posting thread (${parsed.tweets.length} tweets)...`);
        result = await postThread(client, parsed.tweets);
        const firstTweetId = result[0].id;
        markAsPublished(draft.filepath, firstTweetId);
        console.log(`  Posted thread. First tweet ID: ${firstTweetId}`);
      } else {
        console.log("  Posting tweet...");
        result = await postTweet(client, parsed.text);
        markAsPublished(draft.filepath, result.id);
        console.log(`  Posted. Tweet ID: ${result.id}`);
      }
      posted++;
    } catch (error) {
      console.error(`  ERROR: ${error.message}`);
      failed++;
    }

    console.log();
  }

  console.log("=== Done ===");
  console.log(`Posted: ${posted} | Failed: ${failed} | Total: ${xPosts.length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

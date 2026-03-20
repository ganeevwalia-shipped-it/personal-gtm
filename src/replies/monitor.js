/**
 * Reply monitor.
 *
 * Polls for new replies/mentions on your posted tweets and either:
 * - Auto-replies using Claude (auto mode)
 * - Saves reply drafts for your approval (review mode)
 *
 * Mode is controlled by the REPLY_MODE env var: "auto" or "review" (default: "review").
 *
 * Usage:
 *   npm run replies                          # check once
 *   npm run replies -- --mode auto           # auto-reply mode
 *   npm run replies -- --publish-replies     # post approved reply drafts
 */

import "dotenv/config";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createXClient, getMentions, getMe, replyToTweet, getReplies } from "../publishers/x.js";
import { getPublishedTweets } from "../approval.js";
import { draftReply } from "./drafter.js";

const REPLIES_DIR = "replies";
const STATE_FILE = join(REPLIES_DIR, ".last-mention-id");

/**
 * Gets the last processed mention ID to avoid re-processing.
 */
function getLastMentionId() {
  try {
    return readFileSync(STATE_FILE, "utf-8").trim();
  } catch {
    return null;
  }
}

/**
 * Saves the last processed mention ID.
 */
function saveLastMentionId(id) {
  mkdirSync(REPLIES_DIR, { recursive: true });
  writeFileSync(STATE_FILE, id, "utf-8");
}

/**
 * Saves a reply draft for manual review.
 */
function saveReplyDraft({ mention, draftedReply, originalTweet }) {
  const dateDir = join(REPLIES_DIR, "pending");
  mkdirSync(dateDir, { recursive: true });

  const filename = `reply-${mention.id}.md`;
  const filepath = join(dateDir, filename);

  const content = `# Reply to @${mention.authorUsername}

**Status:** Pending
**Mention ID:** ${mention.id}
**In Reply To:** ${mention.id}
**From:** @${mention.authorUsername}
**Date:** ${mention.createdAt}

---

**Your original tweet:**
> ${originalTweet || "(mention — not a reply to your tweet)"}

**Their comment:**
> ${mention.text}

**Drafted reply:**
${draftedReply}
`;

  writeFileSync(filepath, content, "utf-8");
  return filepath;
}

/**
 * Gets approved reply drafts ready to post.
 */
function getApprovedReplies() {
  const pendingDir = join(REPLIES_DIR, "pending");
  let files;
  try {
    files = readdirSync(pendingDir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  const approved = [];

  for (const file of files) {
    const filepath = join(pendingDir, file);
    const raw = readFileSync(filepath, "utf-8");

    if (!raw.includes("**Status:** Approved")) continue;

    const mentionIdMatch = raw.match(/\*\*In Reply To:\*\* (\d+)/);
    const draftMatch = raw.match(/\*\*Drafted reply:\*\*\n([\s\S]+)$/);

    if (mentionIdMatch && draftMatch) {
      approved.push({
        filepath,
        mentionId: mentionIdMatch[1],
        reply: draftMatch[1].trim(),
      });
    }
  }

  return approved;
}

/**
 * Marks a reply draft as posted.
 */
function markReplyAsPosted(filepath, tweetId) {
  let content = readFileSync(filepath, "utf-8");
  content = content.replace("**Status:** Approved", `**Status:** Posted\n**Reply Tweet ID:** ${tweetId}`);
  writeFileSync(filepath, content, "utf-8");
}

function validateEnv() {
  const required = [
    "X_API_KEY",
    "X_API_SECRET",
    "X_ACCESS_TOKEN",
    "X_ACCESS_SECRET",
    "ANTHROPIC_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((key) => console.error(`  - ${key}`));
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: process.env.REPLY_MODE || "review",
    publishReplies: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--mode" && args[i + 1]) {
      options.mode = args[i + 1];
      i++;
    }
    if (args[i] === "--publish-replies") {
      options.publishReplies = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log("\n=== X Reply Monitor ===");
  validateEnv();

  const client = createXClient({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });

  // If publishing approved replies
  if (options.publishReplies) {
    console.log("\nPublishing approved reply drafts...\n");
    const approved = getApprovedReplies();

    if (approved.length === 0) {
      console.log("No approved replies to publish.");
      console.log("To approve a reply, change **Status:** Pending to **Status:** Approved in the reply file.");
      return;
    }

    for (const reply of approved) {
      try {
        console.log(`Posting reply to mention ${reply.mentionId}...`);
        const posted = await replyToTweet(client, reply.mentionId, reply.reply);
        markReplyAsPosted(reply.filepath, posted.id);
        console.log(`  Posted: ${posted.id}`);
      } catch (error) {
        console.error(`  Failed: ${error.message}`);
      }
    }
    return;
  }

  // Main flow: check for new mentions and draft replies
  console.log(`Mode: ${options.mode}`);

  const me = await getMe(client);
  console.log(`Authenticated as: @${me.username} (${me.id})\n`);

  // Get published tweets to match mentions with original posts
  const publishedTweets = getPublishedTweets("drafts");
  const tweetContentMap = new Map();
  for (const pt of publishedTweets) {
    // Read the original content from the file
    const raw = readFileSync(pt.filepath, "utf-8");
    const contentStart = raw.indexOf("---\n");
    const tweetIdLine = raw.indexOf("**Tweet ID:**");
    let content = "";
    if (contentStart !== -1) {
      // Get content after the tweet ID line
      const afterSeparator = raw.slice(contentStart + 4);
      const lines = afterSeparator.split("\n");
      // Skip the tweet ID line and blank lines at the start
      const contentLines = lines.filter((l) => !l.startsWith("**Tweet ID:**") && l.trim() !== "");
      content = contentLines.join("\n").trim();
    }
    tweetContentMap.set(pt.tweetId, content);
  }

  // Check for new mentions
  const sinceId = getLastMentionId();
  console.log("Checking for new mentions...");

  const mentions = await getMentions(client, me.id, sinceId);

  if (mentions.length === 0) {
    console.log("No new mentions found.");
    return;
  }

  console.log(`Found ${mentions.length} new mention(s).\n`);

  let replied = 0;
  let queued = 0;
  let skipped = 0;
  let latestId = null;

  for (const mention of mentions) {
    // Track the latest ID for pagination
    if (!latestId || mention.id > latestId) latestId = mention.id;

    // Skip our own tweets
    if (mention.authorId === me.id) continue;

    console.log(`@${mention.authorUsername}: "${mention.text}"`);

    // Find the original tweet content if this is a reply to one of our posts
    const originalContent = tweetContentMap.get(mention.conversationId) || "";

    // Draft a reply using Claude
    const result = await draftReply({
      apiKey: process.env.ANTHROPIC_API_KEY,
      originalTweet: originalContent,
      comment: mention.text,
      commenterUsername: mention.authorUsername,
    });

    if (result.skip) {
      console.log("  → Skipped (spam/troll)\n");
      skipped++;
      continue;
    }

    console.log(`  → Draft: "${result.reply}"`);

    if (options.mode === "auto") {
      // Auto-reply immediately
      try {
        const posted = await replyToTweet(client, mention.id, result.reply);
        console.log(`  → Posted: ${posted.id}\n`);
        replied++;
      } catch (error) {
        console.error(`  → Failed to post: ${error.message}\n`);
      }
    } else {
      // Save for review
      const filepath = saveReplyDraft({
        mention,
        draftedReply: result.reply,
        originalTweet: originalContent,
      });
      console.log(`  → Saved for review: ${filepath}\n`);
      queued++;
    }
  }

  // Save our progress so we don't re-process these mentions
  if (latestId) saveLastMentionId(latestId);

  console.log("=== Done ===");
  if (options.mode === "auto") {
    console.log(`Replied: ${replied} | Skipped: ${skipped}`);
  } else {
    console.log(`Queued for review: ${queued} | Skipped: ${skipped}`);
    if (queued > 0) {
      console.log(`\nReview drafts in: ${REPLIES_DIR}/pending/`);
      console.log('Change **Status:** Pending → **Status:** Approved, then run:');
      console.log("  npm run replies -- --publish-replies");
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

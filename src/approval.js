/**
 * File-based approval system.
 *
 * Drafts are saved with **Status:** Draft. To approve a draft for publishing,
 * change the status to "Approved" in the file. The publish command will
 * scan for approved drafts and post them.
 *
 * Workflow:
 *   1. Run `npm run draft` — generates drafts in drafts/YYYY-MM-DD/
 *   2. Review & edit each markdown file
 *   3. Change "**Status:** Draft" to "**Status:** Approved"
 *   4. Run `npm run publish` — posts all approved drafts to X
 *   5. Status automatically changes to "Published" after posting
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Scans a date folder for approved drafts.
 *
 * @param {string} dateDir - Path to the date folder (e.g. drafts/2026-03-20)
 * @returns {Object[]} Array of { filepath, brand, platform, topic, content }
 */
export function getApprovedDrafts(dateDir) {
  let files;
  try {
    files = readdirSync(dateDir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  const approved = [];

  for (const file of files) {
    const filepath = join(dateDir, file);
    const raw = readFileSync(filepath, "utf-8");

    if (!raw.includes("**Status:** Approved")) continue;

    // Parse metadata from the file header
    const topicMatch = raw.match(/^# (.+)$/m);
    const brandMatch = raw.match(/\*\*Brand:\*\* (\w+)/);
    const platformMatch = raw.match(/\*\*Platform:\*\* (\w+)/);

    // Content is everything after the --- separator
    const contentStart = raw.indexOf("---\n");
    const content = contentStart !== -1 ? raw.slice(contentStart + 4).trim() : raw;

    approved.push({
      filepath,
      brand: brandMatch?.[1] || "unknown",
      platform: platformMatch?.[1] || "unknown",
      topic: topicMatch?.[1] || file,
      content,
    });
  }

  return approved;
}

/**
 * Marks a draft as published after it's been posted.
 * Also records the tweet ID for reply tracking.
 *
 * @param {string} filepath - Path to the draft file
 * @param {string} tweetId - The posted tweet's ID
 */
export function markAsPublished(filepath, tweetId) {
  let content = readFileSync(filepath, "utf-8");

  content = content.replace("**Status:** Approved", `**Status:** Published`);

  // Add tweet ID for reply tracking
  const separator = content.indexOf("---\n");
  if (separator !== -1) {
    const before = content.slice(0, separator + 4);
    const after = content.slice(separator + 4);
    content = `${before}\n**Tweet ID:** ${tweetId}\n\n${after}`;
  }

  writeFileSync(filepath, content, "utf-8");
}

/**
 * Scans all published drafts to get tweet IDs for reply monitoring.
 *
 * @param {string} draftsDir - Base drafts directory
 * @returns {Object[]} Array of { filepath, tweetId, brand, platform, topic }
 */
export function getPublishedTweets(draftsDir) {
  let dateFolders;
  try {
    dateFolders = readdirSync(draftsDir).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f));
  } catch {
    return [];
  }

  const published = [];

  for (const folder of dateFolders) {
    const dateDir = join(draftsDir, folder);
    let files;
    try {
      files = readdirSync(dateDir).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }

    for (const file of files) {
      const filepath = join(dateDir, file);
      const raw = readFileSync(filepath, "utf-8");

      if (!raw.includes("**Status:** Published")) continue;

      const tweetIdMatch = raw.match(/\*\*Tweet ID:\*\* (\d+)/);
      if (!tweetIdMatch) continue;

      const topicMatch = raw.match(/^# (.+)$/m);
      const brandMatch = raw.match(/\*\*Brand:\*\* (\w+)/);
      const platformMatch = raw.match(/\*\*Platform:\*\* (\w+)/);

      published.push({
        filepath,
        tweetId: tweetIdMatch[1],
        brand: brandMatch?.[1] || "unknown",
        platform: platformMatch?.[1] || "unknown",
        topic: topicMatch?.[1] || file,
      });
    }
  }

  return published;
}

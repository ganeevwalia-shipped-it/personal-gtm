/**
 * Local file writer.
 *
 * Saves drafted content as markdown files organized by date.
 * Drop the output folder into Google Drive and you've got cloud sync.
 *
 * Output structure:
 *   drafts/
 *     2026-03-17/
 *       personal-linkedin-why-most-people-use-ai-wrong.md
 *       btbp-substack-the-enterprise-ai-playbook.md
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Saves a drafted post as a markdown file.
 *
 * @param {Object} options
 * @param {string} options.outputDir - Base output directory (default: "drafts")
 * @param {Object} options.entry - Original content calendar entry
 * @param {string} options.draft - Claude's drafted content
 * @returns {string} Path to the saved file
 */
export function saveDraft({ outputDir = "drafts", entry, draft }) {
  // Create date folder: drafts/2026-03-17/
  const dateDir = join(outputDir, entry.date);
  mkdirSync(dateDir, { recursive: true });

  // Build filename: brand-platform-slugified-topic.md
  const slug = entry.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const filename = `${entry.brand}-${entry.platform}-${slug}.md`;
  const filepath = join(dateDir, filename);

  // Build the file content with metadata header
  const content = `# ${entry.topic}

**Brand:** ${entry.brand} | **Platform:** ${entry.platform} | **Date:** ${entry.date}
**Status:** Draft — review and edit before posting

---

${draft}
`;

  writeFileSync(filepath, content, "utf-8");
  console.log(`  Saved: ${filepath}`);

  return filepath;
}

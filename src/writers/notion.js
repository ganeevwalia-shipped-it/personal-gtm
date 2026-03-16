/**
 * Notion writer.
 *
 * Saves drafted content to a Notion database for morning review.
 *
 * Expected Notion database properties:
 *   - Title (title): Post title/topic
 *   - Brand (select): Which brand this is for
 *   - Platform (select): Target platform
 *   - Status (select): "Draft" / "Approved" / "Posted"
 *   - Date (date): Scheduled publish date
 *   - Draft (rich_text): The actual content Claude wrote
 */

import { Client } from "@notionhq/client";

/**
 * Saves a drafted post to Notion.
 *
 * @param {Object} options
 * @param {string} options.apiKey - Notion integration API key
 * @param {string} options.databaseId - Notion database ID
 * @param {Object} options.entry - Original content calendar entry
 * @param {string} options.draft - Claude's drafted content
 * @returns {Object} Created Notion page
 */
export async function saveDraft({ apiKey, databaseId, entry, draft }) {
  const notion = new Client({ auth: apiKey });

  // Notion rich_text has a 2000 character limit per block.
  // Split longer drafts into chunks.
  const draftChunks = splitIntoChunks(draft, 2000);

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Title: {
        title: [{ text: { content: entry.topic } }],
      },
      Brand: {
        select: { name: entry.brand },
      },
      Platform: {
        select: { name: entry.platform },
      },
      Status: {
        select: { name: "Draft" },
      },
      Date: {
        date: { start: entry.date },
      },
    },
    // Put the actual draft content in the page body for easier reading
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: draftChunks.map((chunk) => ({
            type: "text",
            text: { content: chunk },
          })),
        },
      },
    ],
  });

  console.log(`  Saved to Notion: ${page.url}`);
  return page;
}

/**
 * Splits text into chunks of maxLen characters, breaking at newlines when possible.
 */
function splitIntoChunks(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to break at a newline
    let breakPoint = remaining.lastIndexOf("\n", maxLen);
    if (breakPoint === -1 || breakPoint < maxLen / 2) {
      // No good newline break, break at space
      breakPoint = remaining.lastIndexOf(" ", maxLen);
    }
    if (breakPoint === -1) {
      // No good break point at all, hard break
      breakPoint = maxLen;
    }

    chunks.push(remaining.slice(0, breakPoint));
    remaining = remaining.slice(breakPoint).trimStart();
  }

  return chunks;
}

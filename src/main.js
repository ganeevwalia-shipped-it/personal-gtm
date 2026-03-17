/**
 * Nightly content drafting script.
 *
 * This is the main entry point. Run it every night (manually or via cron)
 * and it will:
 *   1. Read tomorrow's content calendar entries from Google Sheets
 *   2. Draft each post using Claude API (voice-matched to brand)
 *   3. Save each draft as a markdown file for morning review
 *
 * Usage:
 *   npm run draft              # drafts for tomorrow
 *   npm run draft -- --date 2026-03-20  # drafts for a specific date
 *   npm run draft -- --dry-run          # preview without saving files
 */

import "dotenv/config";
import { getContentForDate } from "./readers/sheets.js";
import { draftContent } from "./drafters/claude.js";
import { saveDraft } from "./writers/local.js";

/**
 * Returns tomorrow's date as YYYY-MM-DD.
 */
function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

/**
 * Parses CLI arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    date: getTomorrowDate(),
    dryRun: false,
  };

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

/**
 * Validates that all required environment variables are set.
 */
function validateEnv() {
  const required = [
    "ANTHROPIC_API_KEY",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_SHEET_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error("\nCopy .env.example to .env and fill in the values.");
    process.exit(1);
  }
}

async function main() {
  const options = parseArgs();

  console.log(`\n=== Personal GTM Engine ===`);
  console.log(`Drafting content for: ${options.date}`);
  if (options.dryRun) console.log("(DRY RUN — will print drafts but not save files)\n");

  validateEnv();

  // Step 1: Pull content calendar entries from Google Sheets
  console.log("\n[1/3] Reading content calendar from Google Sheets...");
  const entries = await getContentForDate({
    sheetId: process.env.GOOGLE_SHEET_ID,
    tabName: process.env.GOOGLE_SHEET_TAB || "Content Calendar",
    date: options.date,
    credentials: {
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
  });

  if (entries.length === 0) {
    console.log("No content to draft for this date. Exiting.");
    return;
  }

  console.log(`Found ${entries.length} item(s) to draft.\n`);

  // Step 2 & 3: Draft each entry and save
  console.log("[2/3] Drafting content with Claude...\n");

  let drafted = 0;
  let failed = 0;

  for (const entry of entries) {
    console.log(`--- ${entry.brand} / ${entry.platform}: "${entry.topic}" ---`);

    try {
      const result = await draftContent({
        apiKey: process.env.ANTHROPIC_API_KEY,
        entry,
      });

      console.log(`  Drafted (${result.usage.input_tokens} in / ${result.usage.output_tokens} out tokens)`);

      if (options.dryRun) {
        console.log("\n--- DRAFT ---");
        console.log(result.draft);
        console.log("--- END DRAFT ---\n");
      } else {
        console.log("[3/3] Saving draft...");
        saveDraft({ entry, draft: result.draft });
      }

      drafted++;
    } catch (error) {
      console.error(`  ERROR: ${error.message}`);
      failed++;
    }

    console.log();
  }

  console.log("=== Done ===");
  console.log(`Drafted: ${drafted} | Failed: ${failed} | Total: ${entries.length}`);
  if (!options.dryRun && drafted > 0) {
    console.log(`\nDrafts saved to: drafts/${options.date}/`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

/**
 * Content repurposing engine.
 *
 * Takes a long-form BTBP post (Substack article) and generates:
 *   - LinkedIn post (personal brand voice, 200-400 words)
 *   - X thread (personal brand voice, 3-5 tweets)
 *   - TikTok script (AI Maxxing voice, 30-60 seconds)
 *
 * Usage:
 *   node src/drafters/repurpose.js --file path/to/article.txt
 *   node src/drafters/repurpose.js --text "paste your article here"
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "../prompts/system.js";

/**
 * Repurpose formats — each defines what to generate from the source content.
 */
const REPURPOSE_TARGETS = [
  {
    brand: "personal",
    platform: "linkedin",
    instruction:
      "Repurpose this long-form article into a LinkedIn post. Pull out the most compelling insight or story. Don't summarize — pick ONE angle and write a standalone post about it.",
  },
  {
    brand: "personal",
    platform: "x",
    instruction:
      "Repurpose this long-form article into an X thread (3-5 tweets). The first tweet must hook — lead with the most surprising or contrarian take. Each tweet should stand alone but build on the last. End with a takeaway, not a CTA.",
  },
  {
    brand: "ai_maxxing",
    platform: "tiktok",
    instruction:
      "Repurpose this long-form article into a TikTok script (30-60 seconds). Extract the most practical, demo-able takeaway. Format as: HOOK (what viewer sees/hears first), BODY (step-by-step screen recording narration), CLOSE (why save/follow). Write it as a voiceover script.",
  },
];

/**
 * Takes a long-form post and generates all repurposed versions.
 *
 * @param {Object} options
 * @param {string} options.apiKey - Anthropic API key
 * @param {string} options.sourceContent - The long-form article text
 * @param {string} options.sourceTitle - Title of the original article
 * @returns {Array<Object>} Array of { brand, platform, draft }
 */
export async function repurposeContent({ apiKey, sourceContent, sourceTitle }) {
  const client = new Anthropic({ apiKey });
  const results = [];

  for (const target of REPURPOSE_TARGETS) {
    console.log(`  Repurposing for ${target.brand}/${target.platform}...`);

    const systemPrompt = buildSystemPrompt(target.brand, target.platform);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${target.instruction}\n\nOriginal article title: "${sourceTitle}"\n\n---\n\n${sourceContent}`,
        },
      ],
    });

    results.push({
      brand: target.brand,
      platform: target.platform,
      draft: response.content[0].text,
      usage: response.usage,
    });
  }

  return results;
}

// --- CLI support: run this file directly to repurpose from a file ---

import { readFileSync } from "fs";

const isDirectRun = process.argv[1]?.endsWith("repurpose.js");

if (isDirectRun) {
  const args = process.argv.slice(2);
  let sourceContent = "";
  let sourceTitle = "Untitled";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      sourceContent = readFileSync(args[i + 1], "utf-8");
      sourceTitle = args[i + 1].split("/").pop().replace(/\.[^.]+$/, "");
      i++;
    }
    if (args[i] === "--title" && args[i + 1]) {
      sourceTitle = args[i + 1];
      i++;
    }
  }

  if (!sourceContent) {
    console.error("Usage: node src/drafters/repurpose.js --file article.txt [--title 'Article Title']");
    process.exit(1);
  }

  const { config } = await import("dotenv");
  config();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY in .env");
    process.exit(1);
  }

  console.log(`\nRepurposing: "${sourceTitle}"\n`);

  const results = await repurposeContent({
    apiKey: process.env.ANTHROPIC_API_KEY,
    sourceContent,
    sourceTitle,
  });

  for (const result of results) {
    console.log(`\n=== ${result.brand} / ${result.platform} ===`);
    console.log(result.draft);
    console.log(`(${result.usage.input_tokens} in / ${result.usage.output_tokens} out tokens)\n`);
  }
}

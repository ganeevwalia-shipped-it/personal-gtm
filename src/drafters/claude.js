/**
 * Claude API content drafter.
 *
 * Takes a content calendar entry (topic, brand, platform, notes)
 * and generates a draft post using Claude, voice-matched to the brand.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "../prompts/system.js";

/**
 * Drafts a single piece of content using Claude.
 *
 * @param {Object} options
 * @param {string} options.apiKey - Anthropic API key
 * @param {Object} options.entry - Content calendar entry { brand, platform, topic, notes }
 * @returns {Object} { draft: string, model: string, usage: Object }
 */
export async function draftContent({ apiKey, entry }) {
  const client = new Anthropic({ apiKey });

  const systemPrompt = buildSystemPrompt(entry.brand, entry.platform);

  // Build the user message — this is what Claude writes about
  const userMessage = buildUserMessage(entry);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const draft = response.content[0].text;

  return {
    draft,
    model: response.model,
    usage: response.usage,
  };
}

/**
 * Builds the user message that tells Claude what to write about.
 */
function buildUserMessage(entry) {
  let message = `Write a ${entry.platform} post about: ${entry.topic}`;

  if (entry.notes && entry.notes.trim()) {
    message += `\n\nAdditional context and notes:\n${entry.notes}`;
  }

  return message;
}

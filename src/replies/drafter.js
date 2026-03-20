/**
 * Reply drafter.
 *
 * Uses Claude to generate on-brand replies to comments on your tweets.
 * The reply matches your personal brand voice on X.
 */

import Anthropic from "@anthropic-ai/sdk";
import { brands } from "../../config/brands.js";

/**
 * Drafts a reply to a comment on one of your tweets.
 *
 * @param {Object} options
 * @param {string} options.apiKey - Anthropic API key
 * @param {string} options.originalTweet - Your original tweet text
 * @param {string} options.comment - The comment to reply to
 * @param {string} options.commenterUsername - Who wrote the comment
 * @param {string} options.brandKey - Brand key (default: "personal")
 * @returns {Object} { reply, usage }
 */
export async function draftReply({ apiKey, originalTweet, comment, commenterUsername, brandKey = "personal" }) {
  const client = new Anthropic({ apiKey });
  const brand = brands[brandKey];

  const systemPrompt = `You are replying to comments on X as ${brand.name}.

VOICE: ${brand.voice.register}
${brand.voice.style.map((s) => `- ${s}`).join("\n")}

REPLY GUIDELINES:
- Keep replies short — 1-2 sentences max
- Be genuine, not performative
- Match the energy of the comment — if they're excited, match it; if they disagree, be respectful
- Never be defensive or argumentative
- If someone asks a real question, give a real answer
- If it's a troll or spam, don't reply (return exactly: SKIP)
- Don't start every reply with the same pattern
- Don't use "Great question!" or similar filler
- Sound like a real person, not a brand account

NEVER DO:
${brand.voice.avoid.map((a) => `- ${a}`).join("\n")}

OUTPUT: Return ONLY the reply text. No quotes, no "Reply:" prefix, no meta commentary.
If the comment is spam/troll, return exactly: SKIP`;

  const userMessage = `Your original tweet:
"${originalTweet}"

Comment from @${commenterUsername}:
"${comment}"

Write a reply:`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const reply = response.content[0].text.trim();

  return {
    reply,
    skip: reply === "SKIP",
    usage: response.usage,
  };
}

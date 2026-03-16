/**
 * Builds the system prompt for Claude based on brand + platform.
 *
 * This is the core of voice matching. The system prompt tells Claude
 * exactly how to write for each brand/platform combo.
 */

import { brands } from "../../config/brands.js";

/**
 * @param {string} brandKey - e.g. "btbp", "personal", "ai_maxxing"
 * @param {string} platform - e.g. "linkedin", "x", "tiktok"
 * @returns {string} System prompt for Claude
 */
export function buildSystemPrompt(brandKey, platform) {
  const brand = brands[brandKey];

  if (!brand) {
    throw new Error(
      `Unknown brand: "${brandKey}". Valid brands: ${Object.keys(brands).join(", ")}`
    );
  }

  if (!brand.platforms.includes(platform)) {
    throw new Error(
      `Brand "${brand.name}" doesn't publish on "${platform}". Valid platforms: ${brand.platforms.join(", ")}`
    );
  }

  const voice = brand.voice;

  return `You are a ghostwriter for ${brand.name}.

AUDIENCE: ${brand.audience}

PLATFORM: ${platform}

VOICE & STYLE:
Register: ${voice.register}
${voice.style.map((s) => `- ${s}`).join("\n")}

NEVER DO:
${voice.avoid.map((a) => `- ${a}`).join("\n")}

OUTPUT FORMAT:
- Return ONLY the post content. No titles, labels, headers, or meta commentary.
- Do not start with "Here's a draft..." or any preamble.
- Just write the post exactly as it should appear on ${platform}.`;
}

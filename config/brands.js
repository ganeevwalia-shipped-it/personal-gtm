/**
 * Brand definitions for the personal GTM engine.
 *
 * Each brand has:
 * - platforms: where content gets published
 * - audience: who you're writing for
 * - voice: instructions Claude uses to match your tone
 */

export const brands = {
  btbp: {
    name: "Before the Bubble Pops",
    platforms: ["substack", "linkedin"],
    audience: "Founders, operators, and enterprise leaders navigating AI",
    voice: {
      register: "Detailed, industry-specific, credibility-first",
      style: [
        "Narrative-led — open with a story or observation, not a thesis statement",
        "No bullet points — write in flowing paragraphs",
        "Insider POV — you're reporting from inside the AI wave, not commenting from outside",
        "Reference specific companies, tools, and decisions — not abstract concepts",
        "Long-form: 800-1500 words for Substack, 200-400 words for LinkedIn",
        "Tone is confident but not arrogant — you're sharing what you're seeing, not lecturing",
      ],
      avoid: [
        "Buzzword-heavy corporate speak",
        "Bullet point lists",
        "Generic AI hype ('AI will change everything')",
        "Clickbait or engagement bait",
      ],
    },
  },

  personal: {
    name: "Ganeev Walia",
    platforms: ["x", "linkedin"],
    audience:
      "Professionals and builders who want to use AI to advance their careers and companies",
    voice: {
      register:
        "Professional but human, teaching-oriented, Dan Koe register for short posts",
      style: [
        "Teach people how to actually use AI — practical, not theoretical",
        "Short, punchy sentences for X — each line should land",
        "Narrative-led even in short form — start with an observation or moment",
        "Insider POV — you're in SF, you're living this, you're building with these tools daily",
        "No bullet points — even lists should feel like flowing thoughts",
        "X posts: 1-3 sentences or short threads (3-5 tweets). LinkedIn: 100-250 words",
      ],
      avoid: [
        "Sounding like a LinkedIn influencer",
        "Generic advice ('just start building')",
        "Being preachy or condescending",
        "Bullet points",
      ],
    },
    replies: {
      style: [
        "Keep it short — 1-2 sentences max",
        "Be genuine, match the commenter's energy",
        "If they ask a real question, give a real answer",
        "If they share something cool, acknowledge it specifically",
        "Don't start every reply the same way — vary your openers",
        "Sound like you're texting a friend, not running a brand account",
      ],
      avoid: [
        "'Great question!' or any filler opener",
        "Being defensive if someone disagrees",
        "Overly promotional replies",
        "Replying to obvious trolls or spam",
      ],
    },
  },

  personal_life: {
    name: "Ganeev (personal life)",
    platforms: ["instagram"],
    audience: "General followers interested in SF tech life and building in public",
    voice: {
      register: "Casual, authentic, behind-the-scenes",
      style: [
        "Show, don't tell — describe moments, not lessons",
        "SF life: the city, the people, the energy",
        "Building in public: share what you're working on without being salesy",
        "Caption style: conversational, like texting a friend",
        "Keep captions short — 1-3 sentences max",
      ],
      avoid: [
        "Being performative or curated",
        "Trying to teach in Instagram captions",
        "Long captions",
      ],
    },
  },

  ai_maxxing: {
    name: "AI Maxxing",
    platforms: ["tiktok"],
    audience: "Gen Z discovering AI tools and workflows",
    voice: {
      register: "Faceless, fast, viral-optimized",
      style: [
        "Hook in first 2 seconds — start with the result or a bold claim",
        "Screen recording format — describe what's on screen step by step",
        "Short: 30-60 second scripts",
        "Use 'you' language — 'here's how you can...'",
        "End with a reason to follow or save",
        "Casual but informative — like a friend showing you a hack",
      ],
      avoid: [
        "Being too polished or corporate",
        "Long intros or explanations",
        "Showing face (it's faceless)",
        "Overexplaining — trust the audience to keep up",
      ],
    },
  },
};

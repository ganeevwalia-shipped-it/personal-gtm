/**
 * X (Twitter) API client.
 *
 * Handles posting tweets, reading replies, and replying to tweets
 * using the X API v2 via the twitter-api-v2 package.
 *
 * Requires OAuth 1.0a credentials (user-context auth) for read/write access.
 */

import { TwitterApi } from "twitter-api-v2";

/**
 * Creates an authenticated X API client.
 *
 * @param {Object} credentials
 * @param {string} credentials.appKey - API key
 * @param {string} credentials.appSecret - API key secret
 * @param {string} credentials.accessToken - Access token
 * @param {string} credentials.accessSecret - Access token secret
 * @returns {TwitterApi}
 */
export function createXClient(credentials) {
  return new TwitterApi({
    appKey: credentials.appKey,
    appSecret: credentials.appSecret,
    accessToken: credentials.accessToken,
    accessSecret: credentials.accessSecret,
  });
}

/**
 * Posts a tweet.
 *
 * @param {TwitterApi} client
 * @param {string} text - Tweet text (max 280 chars)
 * @returns {Object} { id, text }
 */
export async function postTweet(client, text) {
  const { data } = await client.v2.tweet(text);
  return data;
}

/**
 * Posts a thread (multiple tweets as a chain).
 *
 * @param {TwitterApi} client
 * @param {string[]} tweets - Array of tweet texts
 * @returns {Object[]} Array of { id, text } for each tweet posted
 */
export async function postThread(client, tweets) {
  const posted = [];

  let lastTweetId = null;
  for (const text of tweets) {
    const options = lastTweetId ? { reply: { in_reply_to_tweet_id: lastTweetId } } : {};
    const { data } = await client.v2.tweet(text, options);
    posted.push(data);
    lastTweetId = data.id;
  }

  return posted;
}

/**
 * Gets replies to a specific tweet.
 *
 * @param {TwitterApi} client
 * @param {string} tweetId - The tweet ID to get replies for
 * @param {string} authorId - Your user ID (to find the conversation)
 * @returns {Object[]} Array of { id, text, authorId, authorUsername, createdAt }
 */
export async function getReplies(client, tweetId) {
  // Search for tweets in the conversation
  const tweet = await client.v2.singleTweet(tweetId, {
    "tweet.fields": ["conversation_id"],
  });

  const conversationId = tweet.data.conversation_id;

  const replies = await client.v2.search(
    `conversation_id:${conversationId} is:reply`,
    {
      "tweet.fields": ["author_id", "created_at", "in_reply_to_user_id"],
      expansions: ["author_id"],
      max_results: 100,
    }
  );

  const users = new Map();
  if (replies.includes?.users) {
    for (const user of replies.includes.users) {
      users.set(user.id, user.username);
    }
  }

  const results = [];
  if (replies.data?.data) {
    for (const reply of replies.data.data) {
      results.push({
        id: reply.id,
        text: reply.text,
        authorId: reply.author_id,
        authorUsername: users.get(reply.author_id) || "unknown",
        createdAt: reply.created_at,
      });
    }
  }

  return results;
}

/**
 * Replies to a specific tweet.
 *
 * @param {TwitterApi} client
 * @param {string} tweetId - The tweet to reply to
 * @param {string} text - Reply text
 * @returns {Object} { id, text }
 */
export async function replyToTweet(client, tweetId, text) {
  const { data } = await client.v2.tweet(text, {
    reply: { in_reply_to_tweet_id: tweetId },
  });
  return data;
}

/**
 * Gets the authenticated user's ID and username.
 *
 * @param {TwitterApi} client
 * @returns {Object} { id, username, name }
 */
export async function getMe(client) {
  const { data } = await client.v2.me();
  return data;
}

/**
 * Gets recent mentions of the authenticated user.
 *
 * @param {TwitterApi} client
 * @param {string} userId - Your user ID
 * @param {string} [sinceId] - Only return tweets after this ID
 * @returns {Object[]} Array of mention objects
 */
export async function getMentions(client, userId, sinceId) {
  const options = {
    "tweet.fields": ["author_id", "created_at", "conversation_id", "in_reply_to_user_id"],
    expansions: ["author_id"],
    max_results: 100,
  };

  if (sinceId) {
    options.since_id = sinceId;
  }

  const mentions = await client.v2.userMentionTimeline(userId, options);

  const users = new Map();
  if (mentions.includes?.users) {
    for (const user of mentions.includes.users) {
      users.set(user.id, user.username);
    }
  }

  const results = [];
  if (mentions.data?.data) {
    for (const mention of mentions.data.data) {
      results.push({
        id: mention.id,
        text: mention.text,
        authorId: mention.author_id,
        authorUsername: users.get(mention.author_id) || "unknown",
        conversationId: mention.conversation_id,
        createdAt: mention.created_at,
      });
    }
  }

  return results;
}

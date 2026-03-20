# Setting Up X (Twitter) API Access

## 1. Create a Developer Account

1. Go to [developer.x.com](https://developer.x.com/)
2. Sign in with the X account you want the bot to post from
3. Click "Sign up for Free Account" (Free tier gives you 1,500 tweets/month — enough for a personal bot)
4. Fill out the use case description — mention "personal content publishing and engagement"

## 2. Create a Project & App

1. In the [Developer Portal](https://developer.x.com/en/portal/dashboard), click "Add Project"
2. Name it something like "Personal GTM"
3. Select "Making a bot" as the use case
4. Create an App within the project

## 3. Set Up Authentication

1. In your App settings, go to "User authentication settings"
2. Click "Set up" and configure:
   - **App permissions:** Read and Write
   - **Type of App:** Web App
   - **Callback URL:** `http://localhost` (not used, but required)
   - **Website URL:** your website or `https://x.com/yourusername`

## 4. Get Your API Keys

1. In your App, go to "Keys and Tokens"
2. You need 4 values:

| Key | Where to find it |
|-----|-----------------|
| `X_API_KEY` | API Key (under "Consumer Keys") |
| `X_API_SECRET` | API Key Secret (under "Consumer Keys") |
| `X_ACCESS_TOKEN` | Access Token (under "Authentication Tokens") |
| `X_ACCESS_SECRET` | Access Token Secret (under "Authentication Tokens") |

3. **Important:** Generate the Access Token & Secret *after* setting permissions to Read and Write. If you generated them before, regenerate them.

## 5. Add to .env

```bash
X_API_KEY=your-api-key-here
X_API_SECRET=your-api-key-secret-here
X_ACCESS_TOKEN=your-access-token-here
X_ACCESS_SECRET=your-access-token-secret-here
```

## 6. Test the Connection

```bash
# This will try to authenticate and print your username
node -e "
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';
const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});
const { data } = await client.v2.me();
console.log('Connected as: @' + data.username);
"
```

## Rate Limits (Free Tier)

- **Tweets:** 1,500 per month (posting)
- **Reads:** 10,000 per month (reading tweets/mentions)
- This is plenty for a personal bot posting a few times a day and replying to comments

## Upgrading

If you hit rate limits, the Basic plan ($100/month) gives you:
- 3,000 tweets/month
- 10,000 reads/month
- Access to the search endpoint (needed for conversation tracking)

The Free tier should work fine to start with.

# Slack Standup Backend

Fetches standup messages from Slack → parses them with Gemini AI → saves structured tasks to MongoDB.

---

## Project Structure

```
slack-standup-backend/
├── config/
│   └── db.js                        # MongoDB connection
├── controllers/
│   ├── slack.controller.js          # Slack OAuth + channel endpoints
│   └── standupController.js         # Manual standup submission
├── models/
│   ├── slackIntegration.model.js    # Stores Slack OAuth token
│   ├── Team.js
│   ├── Member.js
│   ├── standup.js
│   ├── standupMessage.js
│   ├── Task.js
│   ├── Activity.js
│   ├── Comment.js
│   ├── Dependency.js
│   └── Notification.js
├── routes/
│   ├── slack.routes.js              # All /api/slack/* routes
│   └── standupRoutes.js             # POST /api/standup
├── services/
│   ├── slack.service.js             # Fetch + save + persist logic
│   └── parserService.js             # Gemini AI parsing
├── .env.example
├── package.json
└── server.js
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Fill in your `.env`:
```env
MONGO_URI=mongodb://localhost:27017/standup_db
PORT=8000
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
SLACK_REDIRECT_URI=http://localhost:8000/api/slack/oauth/callback
GEMINI_API_KEY=...
```

### 3. Create a Slack App
1. Go to https://api.slack.com/apps → **Create New App** → **From Scratch**
2. Under **OAuth & Permissions** → add these **Bot Token Scopes**:
   - `channels:read`
   - `channels:history`
   - `channels:join`
   - `groups:read`
   - `groups:history`
   - `users:read`
   - `users:read.email`
   - `chat:write`
3. Set **Redirect URL** to `http://localhost:8000/api/slack/oauth/callback`
4. Copy **Client ID**, **Client Secret**, **Signing Secret** to `.env`

### 4. Get a Gemini API Key
Go to https://aistudio.google.com/app/apikey and create a key. Add to `.env` as `GEMINI_API_KEY`.

### 5. Start the server
```bash
npm run dev    # with nodemon (auto-restart)
npm start      # production
```

---

## API Endpoints

### Connect Slack
```
GET /api/slack/install
```
Opens in browser → redirects to Slack consent page → token saved automatically.

---

### List Channels
```
GET /api/slack/channels
```
Returns channels the bot can see.

---

### Join a Channel (required before reading messages)
```
POST /api/slack/channels/:channelId/join
```

---

### Fetch Raw Messages (inspection/testing)
```
GET /api/slack/channels/:channelId/messages?limit=50
```

---

### 🔥 Full Pipeline — Fetch → Parse → Save
```
POST /api/slack/channels/:channelId/process?limit=50
```
**This is the main endpoint.** It:
1. Fetches up to `limit` real messages from Slack
2. Saves them to `Team`, `Member`, `Standup`, `StandupMessage` collections
3. Sends to Gemini AI for task extraction
4. Saves tasks to `Task` and `Activity` collections

**Response:**
```json
{
  "message": "Slack standup pipeline completed successfully.",
  "channelId": "C12345",
  "channelName": "standup",
  "processedCount": 3,
  "parsedTaskCount": 5,
  "savedTaskCount": 5,
  "tasks": [...]
}
```

---

### Webhook (Slack Event Subscriptions)
```
POST /api/slack/webhook
```
Configure in Slack app under **Event Subscriptions** with URL:
`https://your-domain.com/api/slack/webhook`

Also accepts manual test payloads:
```json
{
  "channel": { "channelId": "C12345", "channelName": "standup" },
  "messages": [
    {
      "slackUserId": "U123",
      "userName": "Alice",
      "email": "alice@company.com",
      "rawMessage": "Yesterday: finished login page. Today: working on dashboard. No blockers."
    }
  ]
}
```

---

### Manual Standup Submission
```
POST /api/standup
Content-Type: application/json

{
  "memberId": "<MongoDB ObjectId>",
  "message": "Yesterday I finished the auth module. Today I'm starting the dashboard. No blockers."
}
```

---

## Data Flow

```
Slack Channel
     │
     ▼
fetchChannelMessages()       ← Resolves user names + emails via Slack API
     │
     ▼
processSlackData()           ← Upserts Team, Member, Standup, StandupMessage in MongoDB
     │
     ▼
parseStandupMessage()        ← Sends formatted text to Gemini 2.5 Flash
     │
     ▼
saveParsedTasksToDatabase()  ← Creates Task + Activity records in MongoDB
```

---

## Database Collections Written

| Collection       | When                                        |
|------------------|---------------------------------------------|
| `slackintegrations` | After OAuth flow                         |
| `teams`          | On first message from a channel             |
| `members`        | When a Slack user is seen for the first time |
| `standups`       | One per Slack message                       |
| `standupmessages`| One per Slack message (child of Standup)    |
| `tasks`          | One per AI-extracted task                   |
| `activities`     | One per task (logs AI creation event)       |

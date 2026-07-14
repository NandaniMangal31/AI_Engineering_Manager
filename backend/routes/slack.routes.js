import express from 'express';
import {
  installSlack,
  slackOAuthCallback,
  getChannels,
  getChannelMessages,
  joinChannel,
} from '../controllers/slack.controller.js';
import { processSlackData, fetchChannelMessages, saveParsedTasksToDatabase } from '../services/slack.service.js';
import { parseStandupMessage } from '../services/parser.service.js';
import { getSlackClient } from '../services/slack.service.js';
import {
  runFullPipeline
} from '../services/slack.service.js';

const router = express.Router();

// ─── OAuth ────────────────────────────────────────────
// Step 1: Visit this to start the Slack OAuth flow
router.get('/install', installSlack);

// Step 2: Slack redirects here with the auth code
router.get('/oauth/callback', slackOAuthCallback);

// ─── Channel Management ───────────────────────────────
// List all visible channels
router.get('/channels', getChannels);

// Fetch raw messages from a channel (for inspection/testing)
router.get('/channels/:channelId/messages', getChannelMessages);

// Make the bot join a channel
router.post('/channels/:channelId/join', joinChannel);

// ─── Full Pipeline Trigger ────────────────────────────
/**
 * POST /api/slack/channels/:channelId/process
 *
 * MAIN ENDPOINT — end-to-end pipeline:
 *   1. Fetch messages from Slack channel
 *   2. Save raw data to MongoDB (Team, Member, Standup, StandupMessage)
 *   3. Send to Gemini for AI parsing
 *   4. Save parsed tasks to MongoDB (Task, Activity)
 *
 * Query params:
 *   ?limit=50   (number of messages to fetch, default 50)
 */
router.post('/channels/:channelId/process', async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    console.log(
      `🚀 Starting full Slack pipeline for channel ${channelId}...`
    );

    const result = await runFullPipeline(
      channelId,
      limit
    );

    return res.status(200).json(result);

  } catch (error) {
    console.error(
      '❌ Pipeline error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── Webhook (for Slack Event Subscriptions) ──────────
/**
 * POST /api/slack/webhook
 *
 * Used when Slack pushes data to you (Event Subscriptions / Slash Commands).
 * The body must have: { channel: { channelId, channelName }, messages: [...] }
 *
 * For testing, you can POST the same JSON manually.
 */
router.post('/webhook', async (req, res) => {
  try {
    // Slack sends a URL verification challenge on first setup
    if (req.body.type === 'url_verification') {
      return res.status(200).json({ challenge: req.body.challenge });
    }

    const { channel, messages } = req.body;

    if (!channel || !messages) {
      return res.status(400).json({
        error: 'Request body must include "channel" and "messages" fields.',
      });
    }

    // Step 1: Save to MongoDB
    const result = await processSlackData({ channel, messages });

    if (!result.aiReadyText) {
      return res.status(200).json({ message: 'No parseable messages found.', tasks: [] });
    }

    // Step 2: AI Parse
    const parsedTasks = await parseStandupMessage(result.aiReadyText);

    // Step 3: Save tasks
    const savedTasks = await saveParsedTasksToDatabase(parsedTasks);

    res.status(200).json({
      message: 'Webhook processed successfully.',
      processedCount: result.processedCount,
      savedTaskCount: savedTasks.length,
      tasks: savedTasks,
    });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
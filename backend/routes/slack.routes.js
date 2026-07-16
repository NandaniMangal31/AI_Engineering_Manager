import express from 'express';
import { inngest } from "../inngest/client.js";
import {
  installSlack,
  slackOAuthCallback,
  getChannels,
  getChannelMessages,
  joinChannel,
} from '../controllers/slack.controller.js';
import { processSlackData, fetchChannelMessages } from '../services/slack.service.js';
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
router.post("/webhook", async (req, res) => {
    try {
        // =====================================================
        // Slack URL Verification
        // =====================================================

        if (req.body.type === "url_verification") {
            return res.status(200).json({
                challenge: req.body.challenge,
            });
        }

        const { channel, messages } = req.body;

        if (!channel || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                message:
                    'Request body must include "channel" and "messages".',
            });
        }

        // =====================================================
        // Store Slack Data
        // =====================================================

        const processed = await processSlackData({
            channel,
            messages,
        });

        // =====================================================
        // Queue AI Processing
        // =====================================================

        if (processed.aiReadyMessages.length > 0) {
            await inngest.send({
                name: "standup/process",

                data: {
                    source: "SLACK",

                    workspace: {
                        teamId: processed.teamId,
                    },

                    channel,

                    messages:
                        processed.aiReadyMessages,
                },
            });
        }

        // =====================================================
        // Response
        // =====================================================

        return res.status(202).json({
            success: true,

            message:
                "Slack messages queued for AI processing.",

            processedCount:
                processed.processedCount,

            skippedExistingCount:
                processed.skippedExistingCount,

            queuedForAI:
                processed.aiReadyMessages.length,

            teamId:
                processed.teamId,
        });
    } catch (error) {
        console.error(
            "❌ Slack webhook error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to process Slack webhook.",
            error: error.message,
        });
    }
});


export default router;
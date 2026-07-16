import { WebClient } from '@slack/web-api';
import {inngest} from '../inngest/client.js'
import SlackIntegration from '../models/slackIntegration.model.js';
import Team from '../models/Team.js';
import Member from '../models/Member.js';
import Standup from '../models/Standup.js';
import StandupMessage from '../models/StandupMessage.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import {
  downloadSlackAttachments,
  cleanupTemporaryFiles,
  getSlackAccessToken
} from './slackFile.service.js';



export const selectSlackToken = (integration, botToken) => {
  return integration?.accessToken || botToken || null;
};

export const ensureSlackIntegrationSeed = async () => {
  const existingIntegration = await SlackIntegration.findOne({ connected: true });
  if (existingIntegration?.accessToken) {
    return existingIntegration;
  }

  if (!process.env.SLACK_BOT_TOKEN) {
    return null;
  }

  return SlackIntegration.findOneAndUpdate(
    { teamId: 'env-bot-token' },
    {
      teamId: 'env-bot-token',
      teamName: 'Environment Bot Token',
      accessToken: process.env.SLACK_BOT_TOKEN,
      connected: true,
    },
    {
       returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
};

// ─────────────────────────────────────────────
// Helper: get an authenticated Slack WebClient
// ─────────────────────────────────────────────
export const getSlackClient = async () => {
  const integration = await ensureSlackIntegrationSeed();
  const token = selectSlackToken(integration, process.env.SLACK_BOT_TOKEN);

  if (token) {
    return new WebClient(token);
  }

  throw new Error('Slack is not connected. Please complete the OAuth flow at /api/slack/install');
};

// ─────────────────────────────────────────────────────────────────────────────
// fetchChannelMessages
// Directly hits the Slack API and returns raw messages from a given channel.
// ─────────────────────────────────────────────────────────────────────────────
export const fetchChannelMessages = async (channelId, limit = 50) => {
  const client = await getSlackClient();

  // Pull recent messages
  const result = await client.conversations.history({
    channel: channelId,
    limit,
  });

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }

  /*
   * Keep only real user messages.
   *
   * Supported cases:
   * 1. Text only
   * 2. Text + image
   * 3. Text + file
   * 4. Image only
   * 5. File only
   */
  const userMessages = result.messages.filter((msg) => {
    const hasText =
      typeof msg.text === 'string' &&
      msg.text.trim() !== '';

    const hasFiles =
      Array.isArray(msg.files) &&
      msg.files.length > 0;

    return (
      msg.type === 'message' &&
      !msg.subtype &&
      msg.user &&
      (hasText || hasFiles)
    );
  });

  // Resolve user info and attachment metadata for every message
  const enriched = await Promise.all(
    userMessages.map(async (msg) => {
      let userName = 'Unknown User';
      let email = null;

      try {
        const userInfo = await client.users.info({
          user: msg.user,
        });

        if (userInfo.ok) {
          userName =
            userInfo.user.real_name ||
            userInfo.user.profile?.display_name ||
            userInfo.user.name ||
            'Unknown User';

          email =
            userInfo.user.profile?.email || null;
        }
      } catch (err) {
        console.warn(
          `⚠️ Could not fetch user info for ${msg.user}:`,
          err.message
        );
      }

      /*
       * Extract only metadata here.
       *
       * We are NOT downloading anything yet.
       * We are NOT saving anything to the temp folder yet.
       * We are NOT sending attachments to Gemini yet.
       */
      const attachments = (msg.files || []).map((file) => ({
        slackFileId: file.id,

        fileName:
          file.name || null,

        title:
          file.title || null,

        mimeType:
          file.mimetype || null,

        fileType:
          file.filetype || null,

        size:
          file.size || null,

        urlPrivate:
          file.url_private || null,

        urlPrivateDownload:
          file.url_private_download || null,

        permalink:
          file.permalink || null,

        createdAt: file.created
          ? new Date(file.created * 1000).toISOString()
          : null,
      }));

      return {
        slackUserId: msg.user,

        userName,

        email,

        rawMessage:
          msg.text || '',

        ts:
          msg.ts,

        attachments,
      };
    })
  );

  return enriched;
};


// ─────────────────────────────────────────────────────────────────────────────
// processSlackData
// Takes a structured payload { channel, messages } (either from a webhook or
// from our own fetchChannelMessages), saves everything to MongoDB, and returns
// the AI-ready formatted text.
// ─────────────────────────────────────────────────────────────────────────────
export async function processSlackData(slackPayload) {
  const { channel, messages } = slackPayload;

  if (!messages || messages.length === 0) {
    return {
      success: true,
      processedCount: 0,
      skippedExistingCount: 0,
      aiReadyMessages: [],
      alreadyParsedMessages: [],
      teamId: null,
    };
  }

  // ─────────────────────────────────────────
  // 1. CREATE OR UPDATE TEAM
  // ─────────────────────────────────────────

  const team = await Team.findOneAndUpdate(
    {
      slackChannelId: channel.channelId,
    },
    {
      name: channel.channelName,
      slackChannelId: channel.channelId,
      slackChannelName: channel.channelName,
      isSlackConnected: true,
    },
    {
      returnDocument: 'after',
      upsert: true,
    }
  );

  /*
   * aiReadyMessages:
   *
   * Contains only:
   * 1. New Slack messages
   * 2. Existing messages whose previous parsing failed
   *
   * These messages will be sent to Gemini.
   */
  const aiReadyMessages = [];

  /*
   * alreadyParsedMessages:
   *
   * Contains messages that were already successfully parsed.
   *
   * These messages:
   * - will NOT download attachments again
   * - will NOT call Gemini again
   * - will reuse tasks already stored in MongoDB
   */
  const alreadyParsedMessages = [];

  let processedCount = 0;
  let skippedExistingCount = 0;

  // ─────────────────────────────────────────
  // 2. PROCESS EACH SLACK MESSAGE
  // ─────────────────────────────────────────

  for (const msg of messages) {
    const hasText =
      typeof msg.rawMessage === 'string' &&
      msg.rawMessage.trim() !== '';

    const hasAttachments =
      Array.isArray(msg.attachments) &&
      msg.attachments.length > 0;

    // Skip completely empty messages
    if (!hasText && !hasAttachments) {
      continue;
    }

    // ─────────────────────────────────────────
    // 3. CHECK EXISTING SLACK MESSAGE
    // ─────────────────────────────────────────

    let existingSlackMessage = null;

    if (msg.ts) {
      existingSlackMessage =
        await StandupMessage.findOne({
          slackTimestamp: msg.ts,
        });
    }

    // ─────────────────────────────────────────
    // CASE 1:
    // MESSAGE ALREADY PARSED SUCCESSFULLY
    // ─────────────────────────────────────────

    if (
      existingSlackMessage &&
      existingSlackMessage.parsed === true
    ) {
      console.log(
        `♻️ Slack message ${msg.ts} already parsed successfully. Reusing saved tasks.`
      );

      alreadyParsedMessages.push({
        standupId:
          existingSlackMessage.standupId,

        standupMessageId:
          existingSlackMessage._id,

        memberId:
          existingSlackMessage.memberId,

        slackTimestamp:
          msg.ts,
      });

      skippedExistingCount++;

      /*
       * IMPORTANT:
       *
       * We continue immediately.
       *
       * Therefore:
       * - attachments are NOT downloaded
       * - Gemini is NOT called
       * - new Standup is NOT created
       * - new StandupMessage is NOT created
       */
      continue;
    }

    // ─────────────────────────────────────────
    // CASE 2:
    // MESSAGE EXISTS BUT IS NOT PARSED
    // RETRY EXISTING MESSAGE
    // ─────────────────────────────────────────

    if (
      existingSlackMessage &&
      existingSlackMessage.parsed === false
    ) {
      console.log(
        `🔄 Slack message ${msg.ts} exists but is not parsed. Retrying...`
      );

      const existingMember =
        await Member.findById(
          existingSlackMessage.memberId
        );

      if (!existingMember) {
        console.warn(
          `⚠️ Member not found for Slack message ${msg.ts}. Skipping.`
        );

        continue;
      }

      const existingStandup =
        await Standup.findById(
          existingSlackMessage.standupId
        );

      if (!existingStandup) {
        console.warn(
          `⚠️ Standup not found for Slack message ${msg.ts}. Skipping.`
        );

        continue;
      }

      // Download attachments again only because
      // previous parsing did not complete successfully.
      let downloadedFiles = [];

      if (hasAttachments) {
        const slackToken =
          await getSlackAccessToken();

        downloadedFiles =
          await downloadSlackAttachments(
            msg.attachments,
            slackToken
          );

        console.log(
          `📎 Re-downloaded ${downloadedFiles.length} file(s) for retry from ${existingMember.name}`
        );
      }

      aiReadyMessages.push({
        member: {
          memberId: existingMember._id,

          slackUserId:
            existingMember.slackUserId,

          name:
            existingMember.name,
        },

        standupId:
          existingStandup._id,

        standupMessageId:
          existingSlackMessage._id,

        rawMessage:
          existingSlackMessage.rawMessage ||
          msg.rawMessage ||
          '',

        attachments:
          msg.attachments ||
          existingSlackMessage.attachments ||
          [],

        downloadedFiles,

        slackTimestamp:
          msg.ts,
      });

      processedCount++;

      continue;
    }

    // ─────────────────────────────────────────
    // CASE 3:
    // COMPLETELY NEW SLACK MESSAGE
    // ─────────────────────────────────────────

    // ─────────────────────────────────────────
    // FIND OR CREATE MEMBER
    // ─────────────────────────────────────────

    let member = await Member.findOne({
      slackUserId: msg.slackUserId,
    });

    if (!member) {
      const safeEmail =
        msg.email ||
        `${msg.slackUserId}@slack.placeholder`;

      member = await Member.create({
        name:
          msg.userName || 'Unknown User',

        email:
          safeEmail,

        slackUserId:
          msg.slackUserId,

        role:
          'Developer',

        teamId:
          team._id,

        isActive:
          true,
      });

      console.log(
        `👤 Created new member: ${member.name} (${member.slackUserId})`
      );
    } else if (!member.teamId) {
      member.teamId = team._id;

      await member.save();
    }

    const rawMessage = hasText
      ? msg.rawMessage.trim()
      : '';

    // ─────────────────────────────────────────
    // CREATE STANDUP
    // ─────────────────────────────────────────

    const standup = await Standup.create({
      submittedBy:
        member._id,

      source:
        'Slack',

      parsingStatus:
        'Pending',

      message:
        rawMessage,

      parsed:
        false,
    });

    // ─────────────────────────────────────────
    // CREATE STANDUP MESSAGE
    // ─────────────────────────────────────────

    const standupMessage =
      await StandupMessage.create({
        standupId:
          standup._id,

        memberId:
          member._id,

        rawMessage,

        attachments:
          msg.attachments || [],

        slackTimestamp:
          msg.ts || null,

        parsed:
          false,
      });

    // ─────────────────────────────────────────
    // DOWNLOAD ATTACHMENTS FOR NEW MESSAGE
    // ─────────────────────────────────────────

    let downloadedFiles = [];

    if (hasAttachments) {
      const slackToken =
        await getSlackAccessToken();

      downloadedFiles =
        await downloadSlackAttachments(
          msg.attachments,
          slackToken
        );

      console.log(
        `📎 Downloaded ${downloadedFiles.length} file(s) for message from ${member.name}`
      );
    }

    // ─────────────────────────────────────────
    // ADD NEW MESSAGE TO AI QUEUE
    // ─────────────────────────────────────────

    aiReadyMessages.push({
      member: {
        memberId:
          member._id,

        slackUserId:
          member.slackUserId,

        name:
          member.name,
      },

      standupId:
        standup._id,

      standupMessageId:
        standupMessage._id,

      rawMessage,

      attachments:
        msg.attachments || [],

      downloadedFiles,

      slackTimestamp:
        msg.ts || null,
    });

    processedCount++;
  }

  console.log(
    '🔍 processSlackData result:',
    {
      processedCount,

      skippedExistingCount,

      aiReadyMessagesCount:
        aiReadyMessages.length,

      alreadyParsedMessagesCount:
        alreadyParsedMessages.length,
    }
  );

  return {
    success: true,

    processedCount,

    skippedExistingCount,

    aiReadyMessages,

    alreadyParsedMessages,

    teamId:
      team._id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// runFullPipeline
// Fetch Slack messages → save exact message contexts → parse each message
// individually with Gemini → save tasks using exact Member/Standup/Message IDs
// ─────────────────────────────────────────────────────────────────────────────

export async function runFullPipeline(
  channelId,
  limit = 50
) {
  let downloadedFiles = [];

  try {
    console.log(
      `📥 Fetching up to ${limit} messages from Slack channel ${channelId}...`
    );

    // =====================================================
    // 1. Get Slack Client
    // =====================================================

    const client = await getSlackClient();

    // =====================================================
    // 2. Resolve Channel Name
    // =====================================================

    let channelName = channelId;

    try {
      const { ok, channel } =
        await client.conversations.info({
          channel: channelId,
        });

      if (ok && channel) {
        channelName =
          channel.name || channelId;
      }
    } catch (error) {
      console.warn(
        `⚠️ Failed to resolve channel name: ${error.message}`
      );
    }

    // =====================================================
    // 3. Fetch Slack Messages
    // =====================================================

    const messages =
      await fetchChannelMessages(
        channelId,
        limit
      );

    console.log(
      `📨 Retrieved ${messages.length} Slack message(s).`
    );

    // =====================================================
    // 4. Store Slack Data
    // =====================================================

    const processed =
      await processSlackData({
        channel: {
          channelId,
          channelName,
        },

        messages,
      });

    // Track downloaded files for cleanup
    for (const message of processed.aiReadyMessages) {
      if (
        Array.isArray(message.downloadedFiles)
      ) {
        downloadedFiles.push(
          ...message.downloadedFiles
        );
      }
    }

    console.log(
      `📦 ${processed.aiReadyMessages.length} message(s) queued for AI processing.`
    );

    // =====================================================
    // 5. Trigger Inngest AI Pipeline
    // =====================================================

    if (
      processed.aiReadyMessages.length > 0
    ) {
      await inngest.send({
        name: "standup/process",

        data: {
          workspace: {
            teamId: processed.teamId,
          },

          channel: {
            channelId,
            channelName,
          },

          messages:
            processed.aiReadyMessages,

          generatedAt:
            new Date().toISOString(),
        },
      });

      console.log(
        `🚀 Sent ${processed.aiReadyMessages.length} message(s) to Inngest.`
      );
    }

    // =====================================================
    // 6. Response
    // =====================================================

    return {
      success: true,

      message:
        "Slack standup queued for AI processing.",

      channelId,

      channelName,

      teamId:
        processed.teamId,

      processedCount:
        processed.processedCount,

      skippedExistingCount:
        processed.skippedExistingCount,

      queuedForAI:
        processed.aiReadyMessages.length,
    };
  } catch (error) {
    console.error(
      "❌ Slack pipeline failed:",
      error
    );

    throw error;
  } finally {
    if (downloadedFiles.length) {
      try {
        await cleanupTemporaryFiles(
          downloadedFiles
        );

        console.log(
          `🧹 Cleaned ${downloadedFiles.length} temporary file(s).`
        );
      } catch (cleanupError) {
        console.error(
          "❌ Failed to clean temporary files:",
          cleanupError.message
        );
      }
    }
  }
}

import { WebClient } from '@slack/web-api';
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
import { parseStandupMessage } from './parser.service.js';


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
// saveParsedTasksToDatabase
// Takes the AI output array and persists each task to the Task collection,
// linked to the correct Member and Standup. Also logs an Activity record.
// ─────────────────────────────────────────────────────────────────────────────
export async function saveParsedTasksToDatabase(
  parsedTasks,
  messageContext
) {
  const savedTasks = [];

  if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) {
    console.log('ℹ️ No parsed tasks to save.');

    return savedTasks;
  }

  if (!messageContext) {
    throw new Error(
      'Message context is required to save parsed tasks.'
    );
  }

  const {
    member,
    standupId,
    standupMessageId,
  } = messageContext;

  if (!member?.memberId) {
    throw new Error(
      'memberId is missing from message context.'
    );
  }

  if (!standupId) {
    throw new Error(
      'standupId is missing from message context.'
    );
  }

  if (!standupMessageId) {
    throw new Error(
      'standupMessageId is missing from message context.'
    );
  }

  console.log(
    `💾 Saving ${parsedTasks.length} parsed task(s) for ${member.name}`
  );

  for (const taskData of parsedTasks) {
    try {
      // Ignore empty task titles
      if (
        !taskData.taskName ||
        taskData.taskName.trim() === ''
      ) {
        console.warn(
          '⚠️ Skipping task because taskName is empty.'
        );

        continue;
      }

      const title = taskData.taskName.trim();

      const status = normalizeStatus(
        taskData.status
      );

      const priority = normalizePriority(
        taskData.priority
      );

      const workflowStage =
        normalizeWorkflowStage(
          taskData.workflowStage
        );

      /*
       * Prevent duplicate tasks for the exact same:
       *
       * Member
       * Standup
       * Task title
       */
      const existingTask = await Task.findOne({
        memberId: member.memberId,
        standupId,
        title: {
          $regex: new RegExp(
            `^${escapeRegex(title)}$`,
            'i'
          ),
        },
      });

      if (existingTask) {
        console.log(
          `⏭️ Duplicate task skipped: "${title}"`
        );

        savedTasks.push(existingTask);

        continue;
      }

      // Create exact task relationship
      const task = await Task.create({
        memberId: member.memberId,
        standupId,
        title,

        description:
          taskData.blockerDescription || null,

        status,

        workflowStage,

        priority,
      });

      // Log AI activity
      await Activity.create({
        taskId: task._id,

        actorType: 'AI_AGENT',

        actorId: 'gemini-standup-parser',

        activityType: 'STATUS_CHANGE',

        previousStatus: null,

        currentStatus: status,

        newValue: {
          title: task.title,
          priority,
          workflowStage,
        },

        message:
          'Task created from Slack message via Gemini AI parsing.',
      });

      savedTasks.push(task);

      console.log(
        `✅ Saved task: "${task.title}" for ${member.name}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to save task "${taskData.taskName || 'Unknown'}":`,
        error.message
      );
    }
  }

  /*
   * Mark the exact StandupMessage as parsed.
   *
   * We no longer use:
   *
   * findOneAndUpdate({
   *   standupId,
   *   memberId
   * })
   *
   * because we already know the exact StandupMessage ID.
   */
  await StandupMessage.findByIdAndUpdate(
    standupMessageId,
    {
      parsed: true,
    }
  );

  // Mark exact Standup as successfully parsed
  await Standup.findByIdAndUpdate(
    standupId,
    {
      parsingStatus: 'Completed',
      parsed: true,
    }
  );

  return savedTasks;
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
  let allDownloadedFiles = [];

  try {
    console.log(
      `📥 Fetching up to ${limit} messages from Slack channel ${channelId}...`
    );

    // ─────────────────────────────────────────
    // 1. FETCH CHANNEL INFORMATION
    // ─────────────────────────────────────────

    const client = await getSlackClient();

    let channelName = channelId;

    try {
      const channelInfo =
        await client.conversations.info({
          channel: channelId,
        });

      if (
        channelInfo.ok &&
        channelInfo.channel
      ) {
        channelName =
          channelInfo.channel.name ||
          channelId;
      }
    } catch (error) {
      console.warn(
        `⚠️ Could not fetch channel name for ${channelId}:`,
        error.message
      );
    }

    // ─────────────────────────────────────────
    // 2. FETCH SLACK MESSAGES
    // ─────────────────────────────────────────

    const messages =
      await fetchChannelMessages(
        channelId,
        limit
      );

    console.log(
      `📨 Fetched ${messages.length} Slack message(s).`
    );

    // ─────────────────────────────────────────
    // 3. PROCESS SLACK DATA
    // ─────────────────────────────────────────

    const processed =
      await processSlackData({
        channel: {
          channelId,
          channelName,
        },

        messages,
      });

    console.log(
      `📦 Prepared ${processed.aiReadyMessages.length} message(s) for AI parsing.`
    );

    console.log(
      `♻️ Found ${processed.alreadyParsedMessages.length} already-parsed message(s) whose saved tasks can be reused.`
    );

    // ─────────────────────────────────────────
    // 4. PREPARE TASK COLLECTIONS
    // ─────────────────────────────────────────

    const allParsedTasks = [];

    /*
     * Contains only tasks newly created during
     * this pipeline execution.
     */
    const newlySavedTasks = [];

    /*
     * Contains tasks retrieved from MongoDB
     * for messages parsed previously.
     */
    const reusedTasks = [];

    // ─────────────────────────────────────────
    // 5. FETCH ALREADY-PARSED TASKS
    // ─────────────────────────────────────────

    if (
      Array.isArray(
        processed.alreadyParsedMessages
      ) &&
      processed.alreadyParsedMessages.length > 0
    ) {
      const existingStandupIds =
        processed.alreadyParsedMessages
          .map(
            (message) =>
              message.standupId
          )
          .filter(Boolean);

      if (existingStandupIds.length > 0) {
        const existingTasks =
          await Task.find({
            standupId: {
              $in: existingStandupIds,
            },
          });

        reusedTasks.push(
          ...existingTasks
        );

        console.log(
          `♻️ Reused ${existingTasks.length} already-saved task(s) from MongoDB. No Gemini call required for them.`
        );
      }
    }

    // ─────────────────────────────────────────
    // 6. PARSE NEW OR FAILED MESSAGES
    // ─────────────────────────────────────────

    for (
      const messageContext
      of processed.aiReadyMessages
    ) {
      /*
       * Track downloaded files so they can be
       * deleted from temporary storage later.
       */
      if (
        Array.isArray(
          messageContext.downloadedFiles
        ) &&
        messageContext.downloadedFiles.length > 0
      ) {
        allDownloadedFiles.push(
          ...messageContext.downloadedFiles
        );
      }

      const aiText = `
Member: ${messageContext.member.name}
Message: ${messageContext.rawMessage || ''}
      `.trim();

      try {
        console.log(
          `🤖 Parsing Slack message from ${messageContext.member.name}`
        );

        const parsedTasks =
          await parseStandupMessage(
            aiText,

            messageContext.downloadedFiles ||
              []
          );

        console.log(
          `✅ Gemini extracted ${parsedTasks.length} task(s) from message by ${messageContext.member.name}`
        );

        // ─────────────────────────────────────
        // NO ACTIONABLE TASKS FOUND
        // ─────────────────────────────────────

        if (
          !Array.isArray(parsedTasks) ||
          parsedTasks.length === 0
        ) {
          await Standup.findByIdAndUpdate(
            messageContext.standupId,
            {
              parsingStatus:
                'Completed',

              parsed:
                true,
            }
          );

          await StandupMessage.findByIdAndUpdate(
            messageContext.standupMessageId,
            {
              parsed:
                true,
            }
          );

          console.log(
            `ℹ️ No actionable tasks found in message from ${messageContext.member.name}`
          );

          continue;
        }

        // ─────────────────────────────────────
        // SAVE NEWLY PARSED TASKS
        // ─────────────────────────────────────

        const savedTasks =
          await saveParsedTasksToDatabase(
            parsedTasks,
            messageContext
          );

        allParsedTasks.push(
          ...parsedTasks
        );

        newlySavedTasks.push(
          ...savedTasks
        );
      } catch (error) {
        console.error(
          `❌ Failed to parse Slack message from ${messageContext.member.name}:`,
          error.message
        );

        /*
         * Only this exact message fails.
         * Other Slack messages continue processing.
         */

        await Standup.findByIdAndUpdate(
          messageContext.standupId,
          {
            parsingStatus:
              'Failed',

            parsed:
              false,
          }
        );

        await StandupMessage.findByIdAndUpdate(
          messageContext.standupMessageId,
          {
            parsed:
              false,
          }
        );
      }
    }

    // ─────────────────────────────────────────
    // 7. COMBINE NEW + REUSED TASKS
    // ─────────────────────────────────────────

    const allTasks = [
      ...reusedTasks,
      ...newlySavedTasks,
    ];

    console.log(
      '📊 Pipeline summary:',
      {
        newMessagesProcessed:
          processed.processedCount,

        existingMessagesReused:
          processed.skippedExistingCount,

        newTasksParsed:
          allParsedTasks.length,

        newTasksSaved:
          newlySavedTasks.length,

        reusedTasks:
          reusedTasks.length,

        totalTasksReturned:
          allTasks.length,
      }
    );

    // ─────────────────────────────────────────
    // 8. RETURN FRONTEND-COMPATIBLE RESPONSE
    // ─────────────────────────────────────────

    return {
      message:
        'Slack standup pipeline completed successfully.',

      channelId,

      channelName,

      success:
        true,

      /*
       * Number of new or failed messages
       * actually sent for AI processing.
       */
      processedCount:
        processed.processedCount,

      /*
       * Number of successfully parsed messages
       * reused without Gemini.
       */
      skippedExistingCount:
        processed.skippedExistingCount,

      /*
       * Number of new tasks extracted by Gemini
       * during this request.
       */
      parsedTaskCount:
        allParsedTasks.length,

      /*
       * Number of tasks newly saved during
       * this request.
       */
      newlySavedTaskCount:
        newlySavedTasks.length,

      /*
       * Number of existing tasks reused from DB.
       */
      reusedTaskCount:
        reusedTasks.length,

      /*
       * Total tasks returned to frontend.
       */
      totalTaskCount:
        allTasks.length,

      tasks:
        allTasks,

      teamId:
        processed.teamId,
    };
  } catch (error) {
    console.error(
      '❌ FULL PIPELINE ERROR:',
      error
    );

    throw error;
  } finally {
    // ─────────────────────────────────────────
    // 9. CLEAN UP TEMPORARY DOWNLOADED FILES
    // ─────────────────────────────────────────

    if (
      allDownloadedFiles.length > 0
    ) {
      try {
        await cleanupTemporaryFiles(
          allDownloadedFiles
        );

        console.log(
          `🧹 Cleaned up ${allDownloadedFiles.length} temporary Slack file(s).`
        );
      } catch (cleanupError) {
        console.error(
          '❌ Temporary file cleanup failed:',
          cleanupError.message
        );
      }
    }
  }
}

function escapeRegex(value = '') {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

// ─────────────────────────────────────────────
// Normalisation helpers
// ─────────────────────────────────────────────

function normalizeStatus(raw = '') {
  const s = raw.toUpperCase();
  if (s === 'COMPLETED' || s === 'DONE' || s === 'FINISHED') return 'COMPLETED';
  if (s === 'BLOCKED' || s === 'WAITING' || s === 'STUCK') return 'BLOCKED';
  return 'PROCESSING';
}

function normalizePriority(raw = '') {
  const p = (raw || '').toLowerCase();
  if (p.includes('critical')) return 'Critical';
  if (p.includes('high') || p.includes('urgent')) return 'High';
  if (p.includes('low')) return 'Low';
  return 'Medium';
}

function normalizeWorkflowStage(raw = '') {
  const w = (raw || '').toUpperCase();
  if (w === 'QA' || w.includes('TEST')) return 'QA';
  if (w === 'REVIEW' || w.includes('PR') || w.includes('REVIEW')) return 'REVIEW';
  if (w === 'PRODUCTION' || w.includes('PROD') || w.includes('DEPLOY')) return 'PRODUCTION';
  return 'DEVELOPMENT';
}
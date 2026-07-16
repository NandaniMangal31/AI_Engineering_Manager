import { inngest } from "../client.js";
import {  engineeringManagerAgent } from "../../ai/agent/engineeringManager.agent.js";
import Standup from "../../models/Standup.js";
import StandupMessage from "../../models/StandupMessage.js";

/**
 * Builds a single prompt containing every standup message in the batch,
 * so the agent reasons over the whole conversation (dependencies between
 * members included) in one Gemini request instead of one call per message.
 *
 * Expects `messages` to be the same shape the Slack pipeline already
 * produces (`aiReadyMessages`):
 *   { member: { memberId, slackUserId, name }, standupId, standupMessageId,
 *     rawMessage, attachments, downloadedFiles, slackTimestamp }
 *
 * NOTE on attachments: this batches text only. The previous Gemini-SDK
 * parser sent file bytes inline per-message; AgentKit's `agent.run()`
 * takes a text prompt, so for now attachments are only referenced by name
 * to give the agent context that something was shared. If attachment
 * *content* needs to feed into task extraction again, that requires a
 * follow-up piece of work (e.g. a dedicated tool that fetches/summarizes
 * a given attachment on demand) rather than inlining bytes into the batch
 * prompt.
 */
function buildStandupBatchPrompt(messages) {
  return messages
    .map((entry) => {
      const memberName = entry.member?.name || "Unknown member";
      const memberId = entry.member?.memberId;
      const text = entry.rawMessage?.trim() || "(no text provided)";
      const attachmentNames = (entry.attachments || [])
        .map((a) => a.fileName)
        .filter(Boolean);

      return [
        `Member: ${memberName}`,
        `MemberId: ${memberId}`,
        `StandupId: ${entry.standupId}`,
        `StandupMessageId: ${entry.standupMessageId}`,
        `Message: ${text}`,
        attachmentNames.length
          ? `Attachments (names only): ${attachmentNames.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

export const processStandupFunction = inngest.createFunction(
  {
    id: "process-standup",
    retries: 2,
    triggers: [
      {
        event: "standup/process",
      },
    ],
  },
  async ({ event, step }) => {
    const messages = Array.isArray(event.data?.messages) ? event.data.messages : [];

    if (messages.length === 0) {
      return {
        success: true,
        message: "No standup messages to process.",
        processedCount: 0,
      };
    }

    const prompt = [
      "Here is today's full standup conversation. Analyse every member's update,",
      "search for existing tasks before creating new ones, and use your tools to",
      "create/update tasks and log activity so MongoDB accurately reflects this conversation.",
      "",
      buildStandupBatchPrompt(messages),
    ].join("\n");

    // The agent's model inference calls are automatically run through
    // Inngest's step.ai for durability. Tool calls (DB writes) execute
    // synchronously as part of this same run.
    const { output } = await engineeringManagerAgent.run(prompt);

    const standupIds = [...new Set(messages.map((m) => m.standupId).filter(Boolean))];
    const standupMessageIds = messages.map((m) => m.standupMessageId).filter(Boolean);

    await step.run("mark-standup-batch-processed", async () => {
      if (standupIds.length > 0) {
        await Standup.updateMany(
          { _id: { $in: standupIds } },
          { parsingStatus: "Completed", parsed: true }
        );
      }

      if (standupMessageIds.length > 0) {
        await StandupMessage.updateMany(
          { _id: { $in: standupMessageIds } },
          { parsed: true }
        );
      }
    });

    return {
      success: true,
      processedCount: messages.length,
      agentOutput: output,
    };
  }
);

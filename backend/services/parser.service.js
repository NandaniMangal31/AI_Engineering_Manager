import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const taskSchema = {
  type: 'array',
  description: 'List of tasks extracted from Slack stand-up messages and attachments.',

  items: {
    type: 'object',

    properties: {
      owner: {
        type: 'string',
        description:
          "Team member who owns this task. Must match exactly the 'Member:' name from the Slack message context.",
      },

      taskName: {
        type: 'string',
        description:
          'A concise and specific task title extracted from the Slack message and/or its attachments.',
      },

      status: {
        type: 'string',
        description:
          "One of: 'PROCESSING', 'COMPLETED', 'BLOCKED'. Default to 'PROCESSING'.",
      },

      priority: {
        type: 'string',
        description:
          "One of: 'Low', 'Medium', 'High', 'Critical'. Infer only when urgency is clear. Default to 'Low'.",
      },

      workflowStage: {
        type: 'string',
        description:
          "One of: 'DEVELOPMENT', 'QA', 'REVIEW', 'PRODUCTION'. Default to 'DEVELOPMENT'.",
      },

      blockerDescription: {
        type: 'string',
        nullable: true,
        description:
          'Describe the blocker only when status is BLOCKED. Otherwise return null.',
      },
    },

    required: [
      'owner',
      'taskName',
      'status',
      'priority',
      'workflowStage',
    ],
  },
};

/**
 * Converts a downloaded local file into Gemini inline data.
 */
async function createGeminiFilePart(file) {
  if (!file?.localPath) {
    throw new Error('Downloaded file localPath is missing.');
  }

  const fileBuffer = await fs.readFile(file.localPath);

  return {
    inlineData: {
      mimeType:
        file.mimeType ||
        'application/octet-stream',

      data: fileBuffer.toString('base64'),
    },
  };
}

/**
 * Parses Slack stand-up text and optional downloaded attachments.
 *
 * Supports:
 * - Text only
 * - Text + PDF
 * - Text + image
 * - PDF only
 * - Image only
 */
export async function parseStandupMessage(
  rawText,
  downloadedFiles = []
) {
  const hasText =
    typeof rawText === 'string' &&
    rawText.trim() !== '';

  const hasFiles =
    Array.isArray(downloadedFiles) &&
    downloadedFiles.length > 0;

  if (!hasText && !hasFiles) {
    throw new Error(
      'No standup text or attachment provided for parsing.'
    );
  }

  const prompt = `
You are an AI engineering manager and scrum master.

Your job is to analyze Slack messages and their attached files, then extract actionable engineering tasks.

IMPORTANT CONTEXT RULES:

- The Slack message provides the main context and instruction.
- An attached PDF or image may provide additional details about the work.
- Do not automatically convert every sentence inside an attachment into a separate task.
- Use the attachment to understand what the Slack message is asking the team member to do.
- Ignore greetings, casual conversation, attendance notes, and unrelated content.
- Each genuinely distinct actionable task should be a separate array item.

OWNER RULE:
- The "owner" must exactly match the "Member:" name from the Slack message context.
- Never infer another owner from names appearing inside an attachment unless the Slack message explicitly assigns the task to them.

STATUS RULE:
- "done", "finished", "completed" → COMPLETED
- "blocked", "waiting", "stuck" → BLOCKED
- Otherwise → PROCESSING

PRIORITY RULE:
- Explicit critical emergency → Critical
- Explicit urgent/high priority → High
- Explicit medium priority → Medium
- Explicit low priority → Low
- If no priority is mentioned → Low

WORKFLOW STAGE RULE:
- QA/testing → QA
- review/PR/code review → REVIEW
- production/deploy/release → PRODUCTION
- Otherwise → DEVELOPMENT

BLOCKER RULE:
- If status is BLOCKED, explain the blocker in blockerDescription.
- Otherwise blockerDescription should be null.

TASK TITLE RULE:
- Generate a concise task title.
- Preserve the actual meaning of the Slack instruction.
- Use attachment content only when necessary to make the task more specific.

Slack context:

${hasText ? rawText : 'No text message was provided. Analyze the attachment using the available member context.'}
`;

  try {
    const contents = [
      {
        text: prompt,
      },
    ];

    for (const file of downloadedFiles) {
      const filePart = await createGeminiFilePart(file);
      contents.push(filePart);
    }

    console.log(
      `🤖 Sending standup to Gemini with ${downloadedFiles.length} attachment(s).`
    );

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',

      contents,

      config: {
        responseMimeType: 'application/json',
        responseSchema: taskSchema,
      },
    });

    const parsed = JSON.parse(response.text);

    console.log(
      `✅ Gemini parsed ${parsed.length} task(s).`
    );

    return parsed;
  } catch (error) {
    console.error(
      '❌ Gemini Parsing Error:',
      error.message
    );

    throw new Error(
      `Failed to parse standup message via AI: ${error.message}`
    );
  }
}
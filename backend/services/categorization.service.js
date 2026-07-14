import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a strict data categorization engine. Your task is to analyze an array of extracted Slack messages and classify each one based on its intent.
You must output ONLY valid, raw JSON. Do not include any introductory text, concluding remarks, or markdown formatting blocks (like \`\`\`json). Any deviation from pure JSON will break the system.

Categorize each message using these exact rules:
1. "Task": The message dictates an action item, feature request, to-do, or assignment.
2. "Issue": The message reports a bug, error, system failure, or blocker.
3. "General Discussion": The message is conversational, brainstorming, or informational.
   - If you select "General Discussion", evaluate the text to identify if it relates to a specific Task or Issue.

EXPECTED OUTPUT SCHEMA:
Return a JSON array of objects, keeping the original message ID intact. Use this exact structure:
[
  {
    "message_id": "<preserve_original_id>",
    "category": "Task" | "Issue" | "General Discussion",
    "related_context": "<If General Discussion: summarize the specific Task or Issue it relates to. If Task or Issue: set to null.>"
  }
]`;

/**
 * Validates that each message object has required fields.
 * @param {Array} messages
 * @returns {{ valid: boolean, error?: string }}
 */
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: 'messages must be a non-empty array' };
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg.message_id) {
      return { valid: false, error: `messages[${i}] is missing required field: message_id` };
    }
    if (!msg.text || typeof msg.text !== 'string') {
      return { valid: false, error: `messages[${i}] is missing required field: text (string)` };
    }
  }

  return { valid: true };
}

/**
 * Categorizes an array of Slack messages using Gemini.
 * @param {Array<{ message_id: string, text: string, [key: string]: any }>} messages
 * @returns {Promise<Array<{ message_id: string, category: string, related_context: string|null }>>}
 */
export async function categorizeMessages(messages) {
  const validation = validateMessages(messages);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Strip to only the fields Gemini needs to avoid bloating the prompt
  const payload = messages.map(({ message_id, text }) => ({ message_id, text }));

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json', // forces Gemini to return pure JSON
    },
  });

  const result = await model.generateContent(JSON.stringify(payload));
  const rawText = result.response.text();

  // Strip any accidental markdown fences before parsing
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${rawText.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini returned JSON but it was not an array');
  }

  return parsed;
}

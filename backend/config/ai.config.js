import { gemini } from "@inngest/agent-kit";
import dotenv from 'dotenv'

dotenv.config();
export const google = (modelId = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite") =>
  gemini({
    model: modelId,
    apiKey: process.env.GEMINI_API_KEY,
  });
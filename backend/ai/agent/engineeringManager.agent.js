import { createAgent } from "@inngest/agent-kit";
import { google } from "../../config/ai.config.js";
import { ENGINEERING_MANAGER_PROMPT } from "../prompts/index.js";
import { engineeringManagerTools } from "../tools/index.js";

/**
 * The single Engineering Manager agent. It receives the ENTIRE standup
 * conversation (every member's update, batched) in one prompt and decides,
 * turn by turn, which tools to call to bring MongoDB in line with what was
 * said — searching for existing tasks first, then creating/updating tasks
 * and logging activity as needed.
 *
 * Kept as a single Agent (not a Network) for now since there is only one
 * role to play. Because it's a plain createAgent(), it can be dropped into
 * a createNetwork({ agents: [...] }) later — with a router — the moment a
 * second specialized agent (e.g. a Jira agent, a GitHub agent) is added,
 * without changing this file.
 */
export const engineeringManagerAgent = createAgent({
  name: "engineering-manager",
  description:
    "Engineering manager responsible for analysing standup conversations, " +
    "searching existing tasks, and keeping the task board (MongoDB) accurate.",
  system: ENGINEERING_MANAGER_PROMPT,
  model: google("gemini-2.0-flash-lite"),
  tools: engineeringManagerTools,
});

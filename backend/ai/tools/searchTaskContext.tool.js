import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { searchTaskContext } from "../../utils/searchTaskContext.util.js";

import {
    toolSuccess,
    toolError,
    sanitizeTask,
} from "./base.tool.js";

export const searchTaskContextTool = createTool({
    name: "searchTaskContext",

    description:
        "Search existing engineering tasks that are related to the current standup discussion. Use this tool before creating a new task to avoid duplicates and understand project context.",

    parameters: z.object({
        workspaceId: z.string(),

        channelId: z.string(),

        memberId: z.string().optional(),

        standupId: z.string().optional(),

        query: z.string(),

        limit: z.number().default(10),
    }),

    async handler(input) {
        try {
            const tasks = await searchTaskContext(input);

            return toolSuccess(
                `${tasks.length} related task(s) found.`,
                tasks.map(sanitizeTask)
            );
        } catch (error) {
            return toolError(
                "Unable to search task context.",
                error
            );
        }
    },
});
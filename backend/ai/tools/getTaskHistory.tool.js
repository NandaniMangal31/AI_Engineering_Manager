import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { getTaskHistory } from "../../utils/getTaskHistory.util.js";

import {
    toolSuccess,
    toolError,
    sanitizeTask,
    sanitizeActivity,
} from "./base.tool.js";

export const getTaskHistoryTool = createTool({
    name: "getTaskHistory",

    description:
        "Retrieve the complete history of a task including activities, comments and dependencies.",

    parameters: z.object({
        taskId: z.string(),
    }),

    async handler({ taskId }) {
        try {
            const history = await getTaskHistory(taskId);

            return toolSuccess(
                "Task history retrieved successfully.",
                {
                    task: sanitizeTask(history.task),
                    activities: history.activities?.map(sanitizeActivity) ?? [],
                    comments: history.comments ?? [],
                    dependencies: history.dependencies ?? [],
                }
            );
        } catch (error) {
            return toolError(
                "Unable to retrieve task history.",
                error
            );
        }
    },
});
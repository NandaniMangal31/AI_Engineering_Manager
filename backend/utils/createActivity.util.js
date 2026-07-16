// utils/createActivity.util.js

import Activity from "../models/Activity.js";

/**
 * Creates an activity entry for a task.
 * The AI agent decides WHEN an activity should be recorded.
 */
export const createActivity = async ({
    taskId,
    memberId = null,
    type,
    title,
    description = "",
    metadata = {},
}) => {
    const activity = await Activity.create({
        taskId,
        memberId,
        type,
        title,
        description,
        metadata,
    });

    return activity;
};
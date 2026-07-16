// utils/createTask.util.js

import Task from "../models/Task.js";

/**
 * Creates a new task.
 * The AI agent is responsible for deciding WHAT to create.
 * This utility is only responsible for persisting the task.
 */
export const createTask = async ({
    title,
    description,
    memberId,
    standupId,
    channelId,
    workspaceId,
    priority = "LOW",
    status = "PROCESSING",
    workflowStage = "DEVELOPMENT",
    deadline = null,
    source = "SLACK",
    metadata = {},
}) => {
    const task = await Task.create({
        title,
        description,
        memberId,
        standupId,
        channelId,
        workspaceId,
        priority,
        status,
        workflowStage,
        deadline,
        source,
        metadata,
    });

    return task;
};
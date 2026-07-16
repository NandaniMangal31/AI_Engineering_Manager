// utils/getTaskHistory.util.js

import Task from "../models/Task.js";
import Activity from "../models/Activity.js";
import Comment from "../models/Comment.js";
import Dependency from "../models/Dependency.js";
import Notification from "../models/Notification.js";

/**
 * Returns complete task history for the AI agent.
 * This utility DOES NOT modify anything.
 * It only gathers context.
 */
export const getTaskHistory = async (taskId) => {
    if (!taskId) {
        throw new Error("Task ID is required.");
    }

    const task = await Task.findById(taskId)
        .populate("memberId", "name email slackUserId")
        .populate("standupId")
        .lean();

    if (!task) {
        return null;
    }

    const [
        activities,
        comments,
        dependencies,
        notifications,
    ] = await Promise.all([
        Activity.find({ taskId })
            .sort({ createdAt: -1 })
            .lean(),

        Comment.find({ taskId })
            .sort({ createdAt: -1 })
            .lean(),

        Dependency.find({
            $or: [
                { taskId },
                { dependsOnTaskId: taskId },
            ],
        }).lean(),

        Notification.find({ taskId })
            .sort({ createdAt: -1 })
            .lean(),
    ]);

    return {
        task,

        history: {
            activities,
            comments,
            dependencies,
            notifications,
        },
    };
};
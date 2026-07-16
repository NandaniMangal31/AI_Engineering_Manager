import Task from "../models/Task.js";
import Activity from "../models/Activity.js";
import Comment from "../models/Comment.js";
import Dependency from "../models/Dependency.js";

/**
 * Returns task context for the AI Engineering Manager.
 * This utility NEVER decides what task matches.
 * It only gathers candidate information.
 */
export const searchTaskContext = async ({
  memberId,
  standupId,
  limit = 10,
}) => {
  // Active tasks for this member
  const activeTasks = await Task.find({
    memberId,
    status: {
      $in: ["PROCESSING", "BLOCKED"],
    },
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  // Recent completed tasks
  const completedTasks = await Task.find({
    memberId,
    status: "COMPLETED",
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  // Tasks created from the same standup
  const standupTasks = standupId
    ? await Task.find({ standupId }).lean()
    : [];

  const taskIds = [
    ...new Set([
      ...activeTasks.map((t) => t._id.toString()),
      ...completedTasks.map((t) => t._id.toString()),
      ...standupTasks.map((t) => t._id.toString()),
    ]),
  ];

  const activities = await Activity.find({
    taskId: { $in: taskIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const comments = await Comment.find({
    taskId: { $in: taskIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const dependencies = await Dependency.find({
    $or: [
      {
        taskId: { $in: taskIds },
      },
      {
        dependsOnTaskId: { $in: taskIds },
      },
    ],
  }).lean();

  return {
    activeTasks,
    completedTasks,
    standupTasks,
    activities,
    comments,
    dependencies,
  };
};
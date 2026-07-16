import Member from "../models/Member.js";
import Task from "../models/Task.js";
import Standup from "../models/Standup.js";
import StandupMessage from "../models/StandupMessage.js";
import { inngest } from "../inngest/client.js";

// POST /api/standups
// Manual stand-up paste from the dashboard.
//
// NOTE (fix): this previously wrote to an ad-hoc `ManualStandup` model that
// lived only in this file, completely separate from the real `standups`
// collection used by the Slack pipeline. That meant manually-pasted standups
// never showed up next to Slack-sourced ones anywhere in the app. This now
// uses the same Standup + StandupMessage models as the Slack pipeline, with
// source: 'Manual', exactly as the schema's `source` enum intends.


export const processStandup = async (req, res) => {
    try {
        const { rawText, memberId } = req.body;

        // =====================================================
        // Validate Request
        // =====================================================

        if (!rawText || !rawText.trim()) {
            return res.status(400).json({
                success: false,
                message: "rawText is required.",
            });
        }

        // =====================================================
        // Resolve Member (optional)
        // =====================================================

        let member = null;

        if (memberId) {
            member = await Member.findById(memberId);

            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found.",
                });
            }
        }

        // =====================================================
        // Create Standup
        // =====================================================

        const standup = await Standup.create({
            submittedBy: member?._id ?? null,
            source: "Manual",
            message: rawText,
            parsingStatus: "Processing",
            parsed: false,
        });

        // =====================================================
        // Create Standup Message
        // =====================================================

        const standupMessage = await StandupMessage.create({
            standupId: standup._id,
            memberId: member?._id ?? null,
            rawMessage: rawText,
            parsed: false,
        });

        // =====================================================
        // Queue AI Processing
        // =====================================================

        await inngest.send({
            name: "standup/process",
            data: {
                source: "MANUAL",

                workspace: {
                    teamId: null,
                    workspaceId: null,
                    workspaceName: "Manual",
                },

                channel: {
                    channelId: null,
                    channelName: "Manual",
                },

                messages: [
                    {
                        standupId: standup._id,

                        standupMessageId:
                            standupMessage._id,

                        member: member
                            ? {
                                  memberId: member._id,
                                  name: member.name,
                                  email: member.email,
                                  role: member.role,
                              }
                            : {
                                  memberId: null,
                                  name: "Unknown",
                                  email: null,
                                  role: "Developer",
                              },

                        rawMessage: rawText,

                        downloadedFiles: [],

                        attachments: [],
                    },
                ],
            },
        });

        // =====================================================
        // Response
        // =====================================================

        return res.status(202).json({
            success: true,
            message:
                "Standup queued for AI processing.",
            standupId: standup._id,
            standupMessageId:
                standupMessage._id,
        });
    } catch (error) {
        console.error(
            "❌ Manual standup processing failed:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to process standup.",
            error: error.message,
        });
    }
};

// GET /api/standups?limit=20
// Lists recent stand-ups (both Slack-sourced and manually pasted) for the
// Stand-up Summary page.
export const getStandups = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const standups = await Standup.find()
            .populate('submittedBy', 'name role')
            .sort({ createdAt: -1 })
            .limit(limit);
        res.status(200).json(standups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/standups/:id
// A single stand-up plus the tasks that were extracted from it, so the UI
// can show "Extracted Tasks" next to the "Original Message" panel.
export const getStandupById = async (req, res) => {
    try {
        const standup = await Standup.findById(req.params.id).populate('submittedBy', 'name role');
        if (!standup) return res.status(404).json({ error: 'Standup not found.' });

        const tasks = await Task.find({ standupId: standup._id }).populate('memberId', 'name role');

        res.status(200).json({ standup, tasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

import axios from "axios";
import SlackIntegration from "../models/slackIntegration.model.js";
import { getSlackClient } from "../services/slack.service.js";

export const installSlack = async (req, res) => {
  try {
    const url =
      "https://slack.com/oauth/v2/authorize" +
      "?client_id=" +
      process.env.SLACK_CLIENT_ID +
      "&scope=" +
      [
        "channels:read",
        "channels:history",
        "groups:read",
        "groups:history",
        "users:read",
        "team:read",
      ].join(",") +
      "&redirect_uri=" +
      encodeURIComponent(process.env.SLACK_REDIRECT_URI);

    return res.redirect(url);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to start Slack OAuth.",
      error: error.message,
    });
  }
};

export const slackOAuthCallback = async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code missing.",
      });
    }

    const response = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code,
          redirect_uri: process.env.SLACK_REDIRECT_URI,
        },
      },
    );

    const { access_token, bot_user_id, scope, team } = response.data;

    await SlackIntegration.findOneAndUpdate(
      {},
      {
        accessToken: access_token,
        botUserId: bot_user_id,
        teamId: team.id,
        teamName: team.name,
        scope,
        connected: true,
      },
      {
        upsert: true,
        new: true,
      },
    );

    console.log(response.data);

    return res.json({
      data: response.data,
      success: true,
      message: "Slack connected successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getChannels = async (req, res) => {
  try {
    const slack = await getSlackClient();

    const response = await slack.conversations.list({
      types: "public_channel,private_channel",
    });

    const channels = response.channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private,
      isMember: channel.is_member,
      memberCount: channel.num_members,
    }));

    return res.status(200).json({
      success: true,
      channels,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;

    const slack = await getSlackClient();

    const response = await slack.conversations.history({
      channel: channelId,
      limit: 100,
    });

    const userMessages = response.messages.filter((message) => {
    return (
        message.type === "message" &&
        !message.subtype &&
        message.user &&
        message.text
    );
});

const parsedMessages = [];

for (const message of userMessages) {

    const userInfo = await slack.users.info({
        user: message.user,
    });

    parsedMessages.push({
        userName:
            userInfo.user.profile.display_name ||
            userInfo.user.real_name,

        slackUserId: message.user,

        message: message.text,

        timestamp:new Date(Number(message.ts) * 1000).toISOString(),
    });
}



return res.json({
    success: true,
    messages: parsedMessages,
});


   
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const joinChannel = async (req, res) => {
    try {

        const { channelId } = req.params;

        const slack = await getSlackClient();

        const response = await slack.conversations.join({
            channel: channelId,
        });

        return res.status(200).json({
            success: true,
            message: "Bot joined channel successfully.",
            channel: response.channel,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.data?.error || error.message,
        });

    }
};


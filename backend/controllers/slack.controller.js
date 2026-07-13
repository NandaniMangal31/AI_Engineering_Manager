import { WebClient } from '@slack/web-api';
import SlackIntegration from '../models/slackIntegration.model.js';
import { getSlackClient, fetchChannelMessages } from '../services/slack.service.js';
import dotenv from 'dotenv';

dotenv.config();

const { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } = process.env;

export const resolveSlackRedirectUri = (req) => {
  const configuredRedirect = process.env.SLACK_REDIRECT_URI;
  const forwardedProto = req.get?.('x-forwarded-proto') || req.protocol || 'http';
  const forwardedHost = req.get?.('x-forwarded-host') || req.get?.('host');

  if (configuredRedirect && forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
    return configuredRedirect;
  }

  const protocol = forwardedProto.split(',')[0].trim();
  const host = forwardedHost || 'localhost:5000';
  return `${protocol}://${host}/api/slack/oauth/callback`;
};

export const installSlack = (req, res) => {
  const scopes = [
    'channels:read',
    'channels:history',
    'channels:join',
    'groups:read',
    'groups:history',
    'users:read',
    'users:read.email',
    'chat:write',
  ].join(',');

  const redirectUri = resolveSlackRedirectUri(req);
  const slackAuthUrl =
    'https://slack.com/oauth/v2/authorize' +
    `?client_id=${SLACK_CLIENT_ID}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(slackAuthUrl);
};

export const slackOAuthCallback = async (req, res) => {
  console.log('===== OAuth Callback Started =====');
  const { code, error } = req.query;

  if (error || !code) {
    return res.status(400).json({ error: error || 'No code received from Slack.' });
  }

  try {
    const redirectUri = resolveSlackRedirectUri(req);
    const client = new WebClient();
    const oauthResult = await client.oauth.v2.access({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    });

    if (!oauthResult.ok) {
      return res.status(400).json({ error: oauthResult.error });
    }

    const { access_token, team, bot_user_id, scope } = oauthResult;
    const workspaceId = team?.id || oauthResult.team_id || 'unknown-workspace';
    const workspaceName = team?.name || oauthResult.team?.name || 'Slack Workspace';

    await SlackIntegration.findOneAndUpdate(
      { teamId: workspaceId },
      {
        teamId: workspaceId,
        teamName: workspaceName,
        accessToken: access_token,
        botUserId: bot_user_id,
        scope,
        connected: true,
      },
      { new: true, upsert: true }
    );

    console.log(`✅ Slack connected for workspace: ${workspaceName}`);
    return res.redirect(`{process.env.FRONTEND_URL}/dashboard`)

    res.status(200).json({
      message: `Slack connected successfully for workspace: ${workspaceName}`,
      workspace: workspaceName,
    });
  } catch (err) {
    console.error('❌ Slack OAuth error:', err.message);
    res.status(500).json({ error: 'Failed to complete Slack OAuth.' });
  }
};

export const getChannels = async (req, res) => {
  try {
    const client = await getSlackClient();
    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 100,
    });

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    const channels = result.channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.is_private,
      isMember: ch.is_member,
      memberCount: ch.num_members,
    }));

    res.status(200).json({ channels });
  } catch (err) {
    console.error('❌ getChannels error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await fetchChannelMessages(channelId, limit);

    res.status(200).json({
      channelId,
      count: messages.length,
      messages,
    });
  } catch (err) {
    console.error('❌ getChannelMessages error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const client = await getSlackClient();

    const result = await client.conversations.join({ channel: channelId });

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({
      message: `Bot joined channel: ${result.channel.name}`,
      channel: { id: result.channel.id, name: result.channel.name },
    });
  } catch (err) {
    console.error('❌ joinChannel error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

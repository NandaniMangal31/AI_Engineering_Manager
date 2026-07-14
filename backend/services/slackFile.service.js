import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureSlackIntegrationSeed,selectSlackToken } from './slack.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIRECTORY = path.resolve(
  __dirname,
  '../temp/slack-files'
);

/**
 * Ensure that the temporary Slack files directory exists.
 */
async function ensureTempDirectory() {
  await fs.mkdir(TEMP_DIRECTORY, {
    recursive: true,
  });
}

/**
 * Sanitize a filename before saving it to the local filesystem.
 */
function sanitizeFileName(fileName = 'attachment') {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Download a single private Slack attachment to temporary server storage.
 *
 * @param {Object} attachment Slack attachment metadata.
 * @param {string} slackToken Slack bot access token.
 * @returns {Promise<Object>} Metadata for the downloaded temporary file.
 */
export async function downloadSlackAttachment(
  attachment,
  slackToken
) {
  if (!attachment?.slackFileId) {
    throw new Error('Slack file ID is required.');
  }

  if (!slackToken) {
    throw new Error('Slack authentication token is required.');
  }

  const downloadUrl =
    attachment.urlPrivateDownload ||
    attachment.urlPrivate;

  if (!downloadUrl) {
    throw new Error(
      `No private download URL found for Slack file ${attachment.slackFileId}.`
    );
  }

  await ensureTempDirectory();

  const safeFileName = sanitizeFileName(
    attachment.fileName || 'attachment'
  );

  /*
   * Using:
   * - Slack file ID
   * - current timestamp
   * - sanitized original filename
   *
   * prevents filename collisions.
   */
  const localFileName =
    `${attachment.slackFileId}_${Date.now()}_${safeFileName}`;

  const localPath = path.join(
    TEMP_DIRECTORY,
    localFileName
  );

  console.log(
    `⬇️ Downloading Slack attachment: ${attachment.fileName}`
  );

  const response = await fetch(downloadUrl, {
    method: 'GET',

    headers: {
      Authorization: `Bearer ${slackToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download Slack file "${attachment.fileName}". ` +
      `HTTP status: ${response.status}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  await fs.writeFile(
    localPath,
    fileBuffer
  );

  console.log(
    `✅ Slack attachment downloaded temporarily: ${localPath}`
  );

  return {
    slackFileId: attachment.slackFileId,

    fileName: attachment.fileName,

    mimeType: attachment.mimeType,

    fileType: attachment.fileType,

    localPath,

    size: fileBuffer.length,
  };
}

/**
 * Download all attachments belonging to one Slack message.
 *
 * One failed attachment does not prevent other attachments
 * from being downloaded.
 *
 * @param {Array} attachments
 * @param {string} slackToken
 * @returns {Promise<Array>}
 */
export async function downloadSlackAttachments(
  attachments = [],
  slackToken
) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  const downloadedFiles = [];

  for (const attachment of attachments) {
    try {
      const downloadedFile =
        await downloadSlackAttachment(
          attachment,
          slackToken
        );

      downloadedFiles.push(downloadedFile);
    } catch (error) {
      console.error(
        `❌ Failed to download Slack attachment "${attachment.fileName}":`,
        error.message
      );
    }
  }

  return downloadedFiles;
}

/**
 * Delete a single temporary file.
 *
 * Safe to call even if the file has already been deleted.
 */
export async function deleteTemporaryFile(localPath) {
  if (!localPath) {
    return;
  }

  try {
    await fs.unlink(localPath);

    console.log(
      `🗑️ Deleted temporary Slack file: ${localPath}`
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(
        `❌ Failed to delete temporary file "${localPath}":`,
        error.message
      );
    }
  }
}

/**
 * Delete multiple temporary files.
 */
export async function cleanupTemporaryFiles(files = []) {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  await Promise.allSettled(
    files.map((file) =>
      deleteTemporaryFile(file.localPath)
    )
  );
}

export const getSlackAccessToken = async () => {
  const integration = await ensureSlackIntegrationSeed();

  const token = selectSlackToken(
    integration,
    process.env.SLACK_BOT_TOKEN
  );

  if (!token) {
    throw new Error(
      'Slack is not connected. Please complete the OAuth flow at /api/slack/install'
    );
  }

  return token;
};
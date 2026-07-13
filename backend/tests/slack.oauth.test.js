import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSlackRedirectUri } from '../controllers/slack.controller.js';
import { selectSlackToken } from '../services/slack.service.js';

test('uses the current request host when no redirect uri is configured', () => {
  const previous = process.env.SLACK_REDIRECT_URI;
  delete process.env.SLACK_REDIRECT_URI;

  const req = {
    protocol: 'http',
    get(header) {
      if (header === 'host') return 'localhost:5000';
      if (header === 'x-forwarded-proto') return null;
      if (header === 'x-forwarded-host') return null;
      return null;
    },
  };

  assert.equal(resolveSlackRedirectUri(req), 'http://localhost:5000/api/slack/oauth/callback');

  if (previous !== undefined) {
    process.env.SLACK_REDIRECT_URI = previous;
  }
});

test('uses the current host for local development even when a remote redirect uri is configured', () => {
  const previous = process.env.SLACK_REDIRECT_URI;
  process.env.SLACK_REDIRECT_URI = 'https://example.com/api/slack/oauth/callback';

  const req = {
    protocol: 'http',
    get(header) {
      if (header === 'host') return 'localhost:5000';
      if (header === 'x-forwarded-proto') return null;
      if (header === 'x-forwarded-host') return null;
      return null;
    },
  };

  assert.equal(resolveSlackRedirectUri(req), 'http://localhost:5000/api/slack/oauth/callback');

  if (previous !== undefined) {
    process.env.SLACK_REDIRECT_URI = previous;
  } else {
    delete process.env.SLACK_REDIRECT_URI;
  }
});

test('prefers the saved integration token before the environment fallback', () => {
  assert.equal(selectSlackToken({ accessToken: 'saved-token' }, 'env-token'), 'saved-token');
});

test('uses the environment bot token when no saved integration exists', () => {
  assert.equal(selectSlackToken(null, 'env-token'), 'env-token');
});

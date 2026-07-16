import express from 'express';


const router = express.Router();

/**
 * POST /api/categorize
 *
 * Accepts a batch of Slack messages and returns each one
 * classified as "Task", "Issue", or "General Discussion".
 *
 * Request body:
 * {
 *   "messages": [
 *     { "message_id": "msg_001", "text": "Fix the login bug ASAP" },
 *     { "message_id": "msg_002", "text": "The dashboard is crashing on load" }
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "count": 2,
 *   "results": [
 *     { "message_id": "msg_001", "category": "Task", "related_context": null },
 *     { "message_id": "msg_002", "category": "Issue", "related_context": null }
 *   ]
 * }
 */
router.post('/', categorize);

export default router;

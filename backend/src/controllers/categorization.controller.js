

/**
 * POST /api/categorize
 * Body: { messages: Array<{ message_id: string, text: string }> }
 */
export async function categorize(req, res) {
  try {
    const { messages } = req.body;

    if (!messages) {
      return res.status(400).json({
        success: false,
        error: 'Request body must include a "messages" array.',
      });
    }

    const results = await categorizeMessages(messages);

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (err) {
    // Distinguish validation errors (400) from upstream/server errors (500)
    const isValidationError =
      err.message.startsWith('messages[') || err.message === 'messages must be a non-empty array';

    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      error: err.message,
    });
  }
}

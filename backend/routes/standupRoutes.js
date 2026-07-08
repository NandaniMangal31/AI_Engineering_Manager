import express from 'express';
import { processStandup } from '../controllers/standupController.js';

const router = express.Router();

// POST /api/standup
router.post('/', processStandup);

export default router;
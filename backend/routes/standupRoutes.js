import express from 'express';
import { processStandup } from '../controllers/standupController.js';

const router = express.Router();

router.post('/', processStandup);

export default router;
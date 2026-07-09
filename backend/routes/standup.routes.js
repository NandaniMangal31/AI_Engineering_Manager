// routes/standup.routes.js
import express from 'express';
import * as standupController from '../controllers/standupController.js';

const router = express.Router();

router.post('/', standupController.processStandup);

export default router;
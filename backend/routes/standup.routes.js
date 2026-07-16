// routes/standup.routes.js
import express from 'express';
import * as standupController from '../controllers/standup.controller.js';

const router = express.Router();

router.get('/', standupController.getStandups);
router.get('/:id', standupController.getStandupById);
router.post('/', standupController.processStandup);

export default router;
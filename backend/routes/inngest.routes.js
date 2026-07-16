// routes/inngest.routes.js

import express from "express";
import { inngestHandler } from "../inngest/serve.js";

const inngestRouter = express.Router();

inngestRouter.use("/", inngestHandler);

export default inngestRouter;
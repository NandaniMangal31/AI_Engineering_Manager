import { serve } from "inngest/express";
import { inngest } from "./client.js";

import { processStandupFunction } from "./functions/processStandup.function.js";

export const inngestHandler = serve({
    client: inngest,
    functions: [
        processStandupFunction,
    ],
});
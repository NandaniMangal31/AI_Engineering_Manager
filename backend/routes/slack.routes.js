import express from "express";

const router = express.Router();

router.get("/install", (req, res) => {

    res.send("Slack Install");

});

export default router;
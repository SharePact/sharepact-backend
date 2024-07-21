const express = require("express");
const ChatController = require("../controllers/chat");
const { checkAuth } = require("../middleware/checkauth");

const router = express.Router();

// router.post("/send-message", checkAuth, ChatController.sendMessage);
// router.get("/messages/:groupId", checkAuth, ChatController.getMessages);

module.exports = router;

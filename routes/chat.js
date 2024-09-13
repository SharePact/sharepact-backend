const express = require("express");
const ChatController = require("../controllers/chat");
const { checkAuth } = require("../middleware/checkauth");
const { markMessagesAsReadSchema } = require("../zodSchemas/index");
const { ZodMiddleware } = require("../middleware/zod.middleware");

const router = express.Router();

router.get(
  "/messages/group/:groupId",
  checkAuth,
  ChatController.getMessagesByGroup
);
router.get(
  "/messages/unread-count/:groupId",
  checkAuth,
  ChatController.getUnreadMessagesCount
);
router.patch(
  "/messages/mark-as-read",
  checkAuth,
  ZodMiddleware(markMessagesAsReadSchema),
  ChatController.markMessagesAsRead
);

module.exports = router;

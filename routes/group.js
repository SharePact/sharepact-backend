const express = require("express");
const GroupController = require("../controllers/group");
const authenticateUser = require("../middleware/checkAuth");
const { createGroupSchema } = require("../zodSchemas/index");
const { ZodMiddleware } = require("../middleware/zod.middleware");

const router = express.Router();

router.post(
  "/create",
  authenticateUser,
  ZodMiddleware(createGroupSchema),
  GroupController.createGroup
);
router.get(
  "/by-service/:service_id",
  authenticateUser,
  GroupController.getGroupsByServiceId
);
router.get("/", authenticateUser, GroupController.getGroups);
router.post("/join", authenticateUser, GroupController.requestToJoinGroup);
router.post(
  "/handle-join-request",
  authenticateUser,
  GroupController.handleJoinRequest
);
router.get(
  "/join-requests/:groupId",
  authenticateUser,
  GroupController.getJoinRequests
);
router.get("/:groupId", authenticateUser, GroupController.getGroupDetails);
router.post(
  "/activate/:groupId",
  authenticateUser,
  GroupController.activateGroup
);
router.delete("/:id", authenticateUser, GroupController.deleteGroup);
module.exports = router;

const express = require("express");
const GroupController = require("../controllers/group");
const { checkAuth } = require("../middleware/checkAuth");
const { createGroupSchema } = require("../zodSchemas/index");
const { ZodMiddleware } = require("../middleware/zod.middleware");

const router = express.Router();

router.post(
  "/create",
  checkAuth,
  ZodMiddleware(createGroupSchema),
  GroupController.createGroup
);
// New route for updating subscription cost
router.patch(
  "/update-subscription-cost/:groupId",
  checkAuth,
  // ZodMiddleware(updateSubscriptionCostSchema),
  GroupController.updateSubscriptionCost
);

router.get(
  "/by-service/:service_id",
  checkAuth,
  GroupController.getGroupsByServiceId
);
router.get(
  "/grouplist",
  checkAuth,
  GroupController.getGroupsList
);
router.get("/", checkAuth, GroupController.getGroups);
router.post("/join", checkAuth, GroupController.requestToJoinGroup);
router.post(
  "/handle-join-request",
  checkAuth,
  GroupController.handleJoinRequest
);
router.get(
  "/join-requests/:groupId",
  checkAuth,
  GroupController.getJoinRequests
);
router.get(
  "/by-code/:groupCode",
  checkAuth,
  GroupController.getGroupDetailsByCode
);
router.get("/:groupId", checkAuth, GroupController.getGroupDetails);
router.post("/leave/:groupId", checkAuth, GroupController.leaveGroup);
router.post(
  "/confirm-status/:groupId/:action",
  checkAuth,
  GroupController.UpdateConfirmStatus
);
router.post("/activate/:groupId", checkAuth, GroupController.activateGroup);
router.delete("/:id", checkAuth, GroupController.deleteGroup);
module.exports = router;

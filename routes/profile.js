const express = require("express");
const profileController = require("../controllers/profile");
const { checkAuth } = require("../middleware/checkauth");
const { ZodMiddleware } = require("../middleware/zod.middleware");
const { updateNotificationConfigSchema } = require("../zodSchemas/index");

const router = express.Router();

router.patch(
  "/notification-config",
  checkAuth,
  ZodMiddleware(updateNotificationConfigSchema),
  profileController.UpdateNotificationConfig
);
router.get(
  "/notification-config",
  checkAuth,
  ZodMiddleware(updateNotificationConfigSchema),
  profileController.getNotificationConfig
);

router.get("/avatars", checkAuth, profileController.getAllAvatars); // Add this line
router.put("/update-avatar", checkAuth, profileController.updateAvatar);
router.put(
  "/update-username-email",
  checkAuth,
  profileController.updateUsernameAndEmail
);
router.put("/change-password", checkAuth, profileController.changePassword); // Add this line
router.delete("/delete-user", checkAuth, profileController.deleteAccount);

router.get("/notifications", checkAuth, profileController.getNotifications);
router.get("/notifications/:id", checkAuth, profileController.getNotification);
router.patch(
  "/notifications/mark-as-read",
  checkAuth,
  profileController.markNotificationsAsRead
);
router.patch(
  "/notifications/mark-as-read/all",
  checkAuth,
  profileController.markAllNotificationsAsRead
);

module.exports = router;

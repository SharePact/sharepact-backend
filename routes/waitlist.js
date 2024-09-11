const express = require("express");
const waitlistController = require("../controllers/waitlist");
const { checkAuth } = require("../middleware/checkAuth");
const checkAdmin = require("../middleware/checkAdmin");

const router = express.Router();

router.post("/", waitlistController.joinWaitlist);
router.get(
  "/",
  checkAuth,
  checkAdmin,
  waitlistController.getAllWaitlistEntries
);
router.get("/:id", waitlistController.getWaitlistEntryById);
router.put(
  "/:id",
  checkAuth,
  checkAdmin,
  waitlistController.updateWaitlistEntry
);
router.delete(
  "/:id",
  checkAuth,
  checkAdmin,
  waitlistController.deleteWaitlistEntry
);

module.exports = router;

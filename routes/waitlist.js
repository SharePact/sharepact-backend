const express = require("express");
const waitlistController = require("../controllers/waitlist");
const { checkAuth } = require("../middleware/checkauth");
const checkAdmin = require("../middleware/checkadmin");

const router = express.Router();

router.post("/", waitlistController.joinWaitlist);
router.get(
  "/",
  checkAuth,
  checkAdmin,
  waitlistController.getAllWaitlistEntries
);
router.get("/:id", waitlistController.getWaitlistEntryById);

module.exports = router;

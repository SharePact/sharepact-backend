const express = require("express");
const cronJobController = require("../controllers/cronjob.js");

const router = express.Router();

router.get("/recurring-invoices", cronJobController.recurringInvoices);
router.get("/check-members-payments", cronJobController.checkMembersPayments);
router.get(
  "/inactive-members-reminder",
  cronJobController.paymentReminderForInactiveMembers
);
router.get(
  "/group-creator-disbursements",
  cronJobController.groupCreatorDisbursement
);
router.get(
  "/verify-disbursements",
  cronJobController.verifyPendingDisbursements
);
module.exports = router;

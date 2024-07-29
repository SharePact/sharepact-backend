const express = require("express");
const support = require("../controllers/support");
const { contactSupportSchema } = require("../zodSchemas/index");
const { ZodMiddleware } = require("../middleware/zod.middleware");

const router = express.Router();

router.post(
  "/contact-support",
  ZodMiddleware(contactSupportSchema),
  support.contactSupport
);
router.get("/contact-support", support.getContactSupportRequests);
router.get("/contact-support/:id", support.getContactSupportRequest);

router.patch(
  "/contact-support/resolve/:id",
  support.resolveContactSupportRequest
);

module.exports = router;

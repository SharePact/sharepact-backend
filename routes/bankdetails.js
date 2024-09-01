const express = require("express");
const bankDetailsController = require("../controllers/bankdetails");
const { checkAuth } = require("../middleware/checkauth");
const { ZodMiddleware } = require("../middleware/zod.middleware");
const {
  addBankDetailsSchema,
  updateBankDetailsSchema,
} = require("../zodSchemas/index");
const checkAdmin = require("../middleware/checkAdmin");

const router = express.Router();

router.post(
  "/bank-details/",
  checkAuth,
  ZodMiddleware(addBankDetailsSchema),
  bankDetailsController.addBankDetails
);

router.patch(
  "/bank-details/:userId",
  checkAuth,
  checkAdmin,
  ZodMiddleware(updateBankDetailsSchema),
  bankDetailsController.updateBankDetails
);

router.delete(
  "/bank-details/:userId",
  checkAuth,
  checkAdmin,
  bankDetailsController.deleteBankDetails
);

router.get(
  "/bank-details/:userId",
  checkAuth,
  bankDetailsController.getBankDetails
);

router.get("/verify-payment", bankDetailsController.verifyPayment);

router.get(
  "/banks",
  bankDetailsController.getBanks // New route to get list of banks
);

module.exports = router;

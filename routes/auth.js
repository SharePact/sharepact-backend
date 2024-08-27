const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth");
const { ZodMiddleware } = require("../middleware/zod.middleware");
const { createUserSchema } = require("../zodSchemas");
const { checkAuth } = require("../middleware/checkauth");

// Sign-up with email and password
router.post("/signup", ZodMiddleware(createUserSchema), auth.signupWithEmail);

// Sign-in with email and password
router.post("/signin", auth.signinWithEmail);
router.get("/verify-token", checkAuth, auth.verifyToken);
router.post("/logout", checkAuth, auth.logout);
router.post("/logout-all-sessions", checkAuth, auth.logoutAllSessions);
router.get("/user", checkAuth, auth.getUserDetails);
router.post("/password-reset", auth.PasswordReset);
router.patch("/change-password", auth.ChangePassword);

router.post("/password-reset/verify-otp", auth.VerifyPasswordResetOtp);
router.post("/email-verification/resend-otp", auth.ResendEmailVerificationOtp);
router.post("/email-verification/verify-otp", auth.VerifyEmailVerificationOtp);

module.exports = router;

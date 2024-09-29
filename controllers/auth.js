const UserModel = require("../models/user");
const { BuildHttpResponse } = require("../utils/response");
const AuthTokenModel = require("../models/authToken");
const OTPModel = require("../models/otp");
const { getUserFromToken } = require("../middleware/checkauth");

const NotificationService = require("../notification/index");
const inAppNotificationService = require("../notification/inapp");
const { generateRandomUsername, comparePassword } = require("../utils/auth");

// Predefined avatar URLs (example)
const avatarUrls = [
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311179/avatar1_tza31y.png",
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311179/avatar2_yxxssj.png",
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311180/avatar3_v4buk8.png",
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311179/avatar4_pz0p77.png",
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311179/avatar5_v4radg.png",
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311180/avatar6_flsguh.png",
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311179/avatar7_e1nxzw.png",
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311179/avatar8_w4vrxz.png",
  "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1724311180/avatar9_bnz6kd.png",
  // Add more URLs as needed
];

// Sign-up with email and password
exports.signupWithEmail = async (req, res) => {
  const { email, password } = req.body;
  const randomUsername = generateRandomUsername();

  try {
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return BuildHttpResponse(
        res,
        400,
        "Email already exists. Please use a different email address."
      );
    }

    // Assign a random avatar URL
    const avatarUrl = avatarUrls[Math.floor(Math.random() * avatarUrls.length)];
    const newUser = await UserModel.createUser({
      email,
      password: password, // Store hashed password
      username: randomUsername,
      avatarUrl, // Assign avatar URL
      verified: false, // Optional: default value for email verification
      role: "user", // Optional: default user role
    });

    const otp = await OTPModel.createNumberOTP(
      newUser._id,
      "emailVerification",
      6
    );

    await NotificationService.sendNotification({
      type: "emailVerification",
      userId: newUser._id,
      to: [newUser.email],
      textContent: "",
      code: otp.code,
    });

    return BuildHttpResponse(res, 201, "User signed up successfully", newUser);
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

// Sign-in with email and password
exports.signinWithEmail = async (req, res) => {
  const { email, password, deviceToken } = req.body;

  try {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return BuildHttpResponse(res, 400, "Incorrect email or password");
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return BuildHttpResponse(res, 400, "Incorrect email or password");
    }

    if (user.deleted)
      return BuildHttpResponse(
        res,
        400,
        "This account has been deleted, contact support for recovery"
      );

    // delete old token and Generate new token
    await AuthTokenModel.deleteAllTokensByUser(user._id);
    const token = await AuthTokenModel.createToken(user);

    if (deviceToken) await user.updateDeviceToken(deviceToken);

    // Remove sensitive fields from user object before sending in response
    const userWithoutSensitiveInfo = user.toJSON();

    if (user.notificationConfig.loginAlert) {
      await NotificationService.sendNotification({
        type: "loginAlert",
        userId: user._id,
        to: [user.email],
        textContent: "You logged in successfully",
        username: user.username
      });

      if (user.deviceToken) {
        await inAppNotificationService.sendNotification({
          medium: "token",
          topicTokenOrGroupId: user.deviceToken,
          name: "loginAlert",
          userId: user._id,
        });
      }
    }

    return BuildHttpResponse(res, 200, "You have signed in", {
      user: userWithoutSensitiveInfo,
      token,
    });
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getUserDetails = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 500, "user not found");
    }

    return BuildHttpResponse(res, 200, "successful", user.toJSON());
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.logout = async (req, res) => {
  const authToken = req.authToken;
  try {
    const token = await AuthTokenModel.findToken(authToken);
    if (!token) return BuildHttpResponse(res, 200, "You have logged out");

    await AuthTokenModel.deleteToken(authToken);

    return BuildHttpResponse(res, 200, "You have logged out");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.verifyToken = async (req, res) => {
  const authToken = req.authToken;
  try {
    const resp = await getUserFromToken(authToken);
    return BuildHttpResponse(res, 200, "success", {
      valid: resp.user != null && resp.error == null,
    });
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.logoutAllSessions = async (req, res) => {
  const userId = req.user._id;
  try {
    await AuthTokenModel.deleteAllTokensByUser(userId);

    return BuildHttpResponse(res, 200, "successfully logged out");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.PasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return BuildHttpResponse(res, 400, "email is not registered");
    }

    const otp = await OTPModel.createNumberOTP(user._id, "passwordReset", 6);
    await NotificationService.sendNotification({
      type: "passwordReset",
      userId: user._id,
      to: [user.email],
      textContent: "",
      code: otp.code,
    });

    return BuildHttpResponse(res, 200, "OTP has been sent");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.ChangePassword = async (req, res) => {
  const { email, code, password } = req.body;
  try {
    if (!password) return BuildHttpResponse(res, 400, "password is missing");
    if (!code) return BuildHttpResponse(res, 400, "code is missing");

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return BuildHttpResponse(res, 400, "user not found");
    }

    const otp = await OTPModel.getOTPByCode(
      user._id,
      code ?? "",
      "passwordReset"
    );

    if (!otp) {
      return BuildHttpResponse(res, 400, "invalid code");
    }

    await OTPModel.deleteOTPUser(user._id);

    await user.updatePassword(password);

    if (user.notificationConfig?.passwordChanges) {
      await NotificationService.sendNotification({
        type: "passwordChangeAlert",
        userId: user._id,
        to: [user.email],
        textContent: "Password has been changed",
      });

      if (user?.deviceToken) {
        await inAppNotificationService.sendNotification({
          medium: "token",
          topicTokenOrGroupId: user?.deviceToken,
          name: "passwordChangeAlert",
          userId: user._id,
        });
      }
    }

    return BuildHttpResponse(res, 200, "Password has been changed");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.VerifyPasswordResetOtp = async (req, res) => {
  const { email, code } = req.body;
  try {
    if (!code) return BuildHttpResponse(res, 400, "code is missing");

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return BuildHttpResponse(res, 400, "user not found");
    }

    const otp = await OTPModel.getOTPByCode(
      user._id,
      code ?? "",
      "passwordReset"
    );

    if (!otp) {
      return BuildHttpResponse(res, 400, "invalid code");
    }

    return BuildHttpResponse(res, 200, "valid code");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.ResendEmailVerificationOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return BuildHttpResponse(res, 400, "user not found");
    }

    const otp = await OTPModel.createNumberOTP(
      user._id,
      "emailVerification",
      6
    );

    await NotificationService.sendNotification({
      type: "emailVerification",
      userId: user._id,
      to: [user.email],
      textContent: "",
      code: otp.code,
    });

    return BuildHttpResponse(res, 200, "OTP has been sent");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.VerifyEmailVerificationOtp = async (req, res) => {
  const { email, code } = req.body;
  try {
    if (!code) return BuildHttpResponse(res, 400, "code is missing");
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return BuildHttpResponse(res, 400, "user not found");
    }

    const otp = await OTPModel.getOTPByCode(
      user._id,
      code ?? "",
      "emailVerification"
    );

    if (!otp) {
      return BuildHttpResponse(res, 400, "invalid code");
    }

    await OTPModel.deleteOTPUser(user._id);

    await user.verifyUser();

    await NotificationService.sendNotification({
      type: "emailVerificationSuccessful",
      userId: user._id,
      to: [user.email],
      textContent: "Email successfully verified",
      username: user.username
    });
    // Trigger welcome email after successful verification
    await NotificationService.sendNotification({
      type: "welcome",
      userId: user._id,
      to: [user.email],
      textContent: "Welcome to Sharepact! We're glad to have you on board.",
      username: user.username
    });

    return BuildHttpResponse(res, 200, "Email has been verified");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

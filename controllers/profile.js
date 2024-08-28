const User = require("../models/user");
const { comparePassword } = require("../utils/auth");
const { BuildHttpResponse } = require("../utils/response");
const AuthTokenModel = require("../models/authToken");
const NotificationModel = require("../models/Notifications");
const NotificationService = require("../notification/index");

// Predefined avatar URLs
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

// Get all available avatars
exports.getAllAvatars = (req, res) => {
  return BuildHttpResponse(res, 200, "Avatars retrieved successfully", {
    avatars: avatarUrls,
  });
};

// Update user's avatar
exports.updateAvatar = async (req, res) => {
  const { avatarUrl } = req.body;
  const userId = req.user._id;

  if (!avatarUrl) {
    return BuildHttpResponse(res, 400, "avatarUrl is required");
  }

  try {
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { avatarUrl },
      { new: true }
    );

    if (!user) {
      return BuildHttpResponse(res, 404, "User not found");
    }

    return BuildHttpResponse(res, 200, "Avatar updated successfully", {
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    return BuildHttpResponse(res, 500, "Internal server error");
  }
};

// Update user's username
exports.updateUsernameAndEmail = async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user._id;

  if (!username) {
    return BuildHttpResponse(res, 400, "provide username");
  }

  try {
    const user = await User.findById(userId);
    if (!user) return BuildHttpResponse(res, 404, "User not found");

    let updateToUsername = null;
    let updateToEmail = null;
    if (username) {
      const existingUser = await User.findByUsername(username);
      if (existingUser && existingUser._id.toString() != userId.toString())
        return BuildHttpResponse(res, 400, "username already exists");
      updateToUsername = username;
    }
    console.log(2);
    if (email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser._id.toString() != userId.toString())
        return BuildHttpResponse(res, 400, "username already exists");
      updateToEmail = email;
    }
    console.log(3);

    await user.updateUsernameAndEmail({
      username: updateToUsername,
      email: updateToEmail,
    });

    console.log(4);

    return BuildHttpResponse(res, 200, "Username/Email updated successfully", {
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    return BuildHttpResponse(res, 500, error.name);
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  if (!currentPassword)
    return BuildHttpResponse(res, 400, "provide current password");
  if (!newPassword) return BuildHttpResponse(res, 400, "provide new password");

  try {
    const user = await User.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 404, "User not found");
    }

    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return BuildHttpResponse(res, 400, "Incorrect current password.");
    }

    await user.updatePassword(newPassword);

    if (user.notificationConfig?.passwordChanges) {
      await NotificationService.sendNotification({
        type: "passwordChangeAlert",
        userId: user._id,
        to: [user.email],
        textContent: "Password change successful",
      });
    }

    return BuildHttpResponse(res, 200, "Password changed successfully");
  } catch (error) {
    console.error("Error changing password:", error);
    return BuildHttpResponse(res, 500, "Internal server error");
  }
};

exports.deleteAccount = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 500, "user not found");
    }

    await AuthTokenModel.deleteAllTokensByUser(user._id);

    await user.deleteAccount();

    return BuildHttpResponse(res, 200, "successful deleted account");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.UpdateNotificationConfig = async (req, res) => {
  const userId = req.user._id;
  const {
    loginAlert,
    passwordChanges,
    newGroupCreation,
    groupInvitation,
    groupMessages,
    subscriptionUpdates,
    paymentReminders,
    renewalAlerts,
  } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 500, "user not found");
    }

    await user.updateNotificationConfig({
      loginAlert,
      passwordChanges,
      newGroupCreation,
      groupInvitation,
      groupMessages,
      subscriptionUpdates,
      paymentReminders,
      renewalAlerts,
    });

    return BuildHttpResponse(res, 200, "update successful");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getNotifications = async (req, res) => {
  const userId = req.user._id;
  const { page, limit } = req.pagination;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 500, "user not found");
    }

    const notifications = await NotificationModel.getNotifications(
      userId,
      page,
      limit
    );

    return BuildHttpResponse(
      res,
      200,
      "successful",
      notifications.results,
      notifications.pagination
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getNotification = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 500, "user not found");
    }

    const notification = await NotificationModel.findById(id);
    if (!notification) {
      return BuildHttpResponse(res, 500, "notification not found");
    }

    return BuildHttpResponse(res, 200, "successful", notification);
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.markNotificationsAsRead = async (req, res) => {
  const userId = req.user._id;
  const { ids } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 500, "user not found");
    }

    await NotificationModel.markAsRead(ids, userId);

    return BuildHttpResponse(res, 200, "successful");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.markAllNotificationsAsRead = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 500, "user not found");
    }

    await NotificationModel.markAllAsRead(userId);

    return BuildHttpResponse(res, 200, "successful");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

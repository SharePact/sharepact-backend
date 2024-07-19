const User = require('../models/user');
const { hashPassword, comparePassword } = require('../utils/auth');
const { BuildHttpResponse } = require('../utils/response');

// Predefined avatar URLs
const avatarUrls = [
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar1.png',
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar2.png',
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar3.png',
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar4.png',
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar5.png',
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar6.png',
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar7.png',
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar8.png',
  'https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar9.png',
  // Add more URLs as needed
];

// Get all available avatars
exports.getAllAvatars = (req, res) => {
  return BuildHttpResponse(res, 200, "Avatars retrieved successfully", { avatars: avatarUrls });
};

// Update user's avatar
exports.updateAvatar = async (req, res) => {
  const { userId, avatarUrl } = req.body;

  if (!userId || !avatarUrl) {
    return BuildHttpResponse(res, 400, "Missing required fields");
  }

  try {
    const user = await User.findOneAndUpdate({ _id: userId }, { avatarUrl }, { new: true });

    if (!user) {
      return BuildHttpResponse(res, 404, "User not found");
    }

    return BuildHttpResponse(res, 200, "Avatar updated successfully", { avatarUrl: user.avatarUrl });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return BuildHttpResponse(res, 500, "Internal server error");
  }
};

// Update user's username
exports.updateUsername = async (req, res) => {
  const { userId, username } = req.body;

  if (!userId || !username) {
    return BuildHttpResponse(res, 400, "Missing required fields");
  }

  try {
    const user = await User.findOneAndUpdate({ _id: userId }, { username }, { new: true });

    if (!user) {
      return BuildHttpResponse(res, 404, "User not found");
    }

    return BuildHttpResponse(res, 200, "Username updated successfully", { username: user.username });
  } catch (error) {
    if (error.code === 11000) {
      return BuildHttpResponse(res, 400, "Username already exists");
    }
    console.error('Error updating username:', error);
    return BuildHttpResponse(res, 500, "Internal server error");
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return BuildHttpResponse(res, 400, "Missing required fields");
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return BuildHttpResponse(res, 404, "User not found");
    }

    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return BuildHttpResponse(res, 400, "Incorrect current password.");
    }

    const hashedNewPassword = await hashPassword(newPassword);
    user.password = hashedNewPassword;
    await user.save();

    return BuildHttpResponse(res, 200, "Password changed successfully");
  } catch (error) {
    console.error('Error changing password:', error);
    return BuildHttpResponse(res, 500, "Internal server error");
  }
};
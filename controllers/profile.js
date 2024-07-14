const UserModel = require('../models/user');
const { hashPassword, comparePassword } = require('../utils/auth');

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
  res.status(200).json({ avatars: avatarUrls });
};

// Update user's avatar
exports.updateAvatar = async (req, res) => {
  const { userId, avatarUrl } = req.body;

  if (!userId || !avatarUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await UserModel.findOneAndUpdate({ userId }, { avatarUrl }, { new: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Avatar updated successfully', avatarUrl: user.avatarUrl });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user's username
exports.updateUsername = async (req, res) => {
  const { userId, username } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await UserModel.findOneAndUpdate({ userId }, { username }, { new: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Username updated successfully', username: user.username });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await UserModel.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const hashedNewPassword = await hashPassword(newPassword);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

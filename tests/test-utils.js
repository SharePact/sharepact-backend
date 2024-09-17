const mongoose = require("mongoose");
const Waitlist = require("../models/waitlist");
const User = require("../models/user");
const AuthToken = require("../models/authToken");

const createUser = async (
  userData = {
    email: "test@example.com",
    password: "testpassword",
    username: "testuser",
    avatarUrl: "https://example.com/avatar.jpg",
    verified: true,
    role: "admin",
  }
) => {
  const user = new User(userData);
  await user.save();
  return user;
};

const createAuthToken = async (user) => {
  const token = await AuthToken.createToken(user);
  return token;
};

const createWaitlist = async (
  waitlistData = {
    name: "Test Waitlist User",
    email: "waitlist@example.com",
  }
) => {
  const waitlistEntry = new Waitlist(waitlistData);
  await waitlistEntry.save();
  return waitlistEntry;
};

module.exports = {
  createUser,
  createAuthToken,
  createWaitlist,
};

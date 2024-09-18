const Waitlist = require("../models/waitlist");
const mongoose = require("mongoose");
const User = require("../models/user");
const Group = require("../models/group");
const Service = require("../models/service");
const Category = require("../models/category");
const Message = require("../models/message");
const AuthToken = require("../models/authToken");
const OTP = require("../models/otp");
const { hashPassword } = require("../utils/auth");

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

async function createUserWithEmailAndPassword(
  email = "test@example.com",
  password = "testpassword"
) {
  const hashedPassword = await hashPassword(password);
  const user = new User({
    email,
    password: hashedPassword,
    username: "TestUser",
    avatarUrl: "https://example.com/avatar.png",
    verified: true,
  });
  await user.save();
  return user;
}

async function createGroup(service, admin, members = []) {
  const group = new Group({
    service: service._id,
    groupName: "Test Group",
    numberOfMembers: 2,
    subscriptionCost: 10,
    handlingFee: 2,
    individualShare: 5,
    groupCode: "TESTGROUP",
    admin: admin._id,
    members: members.map((userId) => ({ user: userId })),
    oneTimePayment: false,
    activated: true,
    nextSubscriptionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  });
  await group.save();
  return group;
}

async function createCategory() {
  const service = new Category({
    categoryName: "Test Category",
    imageUrl: "https://example.com/service-logo.png",
  });
  await service.save();
  return service;
}

async function createService(
  categoryId,
  handlingFees = 10.0,
  currency = "USD",
  serviceDescription = "test service"
) {
  const service = new Service({
    serviceName: "Test Service",
    logoUrl: "https://example.com/service-logo.png",
    serviceDescription,
    currency,
    handlingFees,
    categoryId,
  });
  await service.save();
  return service;
}

async function createMessage(group, sender) {
  const message = new Message({
    content: "Test message",
    sender: sender._id,
    group: group._id,
  });
  await message.save();
  return message;
}

async function createOTP(user, service) {
  const otp = await OTP.createNumberOTP(user._id, service, 6);
  return otp;
}

module.exports = {
  createCategory,
  createUserWithEmailAndPassword,
  createWaitlist,
  createUser,
  createGroup,
  createService,
  createMessage,
  createAuthToken,
  createOTP,
};

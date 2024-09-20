const mongoose = require("mongoose");
const request = require("supertest");
const { generateToken, comparePassword } = require("../utils/auth");
const User = require("../models/user");
const Group = require("../models/group");
const Category = require("../models/category");
const Service = require("../models/service");
const Message = require("../models/message");
const AuthToken = require("../models/authToken");
const OTP = require("../models/otp");
const Server = require("../middleware/index.js");
const Router = require("../routes/index.js");
const {
  createUserWithEmailAndPassword,
  createGroup,
  createService,
  createMessage,
  createAuthToken,
  createOTP,
  createCategory,
} = require("./test-utils");
const processQueueManager = require("../processQueue");
const NotificationModel = require("../models/Notifications");
const InAppNotificationService = require("../notification/inapp");
const FirebaseService = require("../notification/firebase");

jest.mock("../processQueue", () => ({
  getProcessQueue: jest.fn(),
}));

jest.mock("../notification/brevo", () => ({
  sendEmailWithBrevo: jest.fn(),
}));

jest.mock("../notification/firebase", () => ({
  sendNotification: jest.fn(),
  sendNotificationToTopic: jest.fn(),
}));

describe("Chat API Endpoints", () => {
  let user;
  let authToken;
  let service;
  let group;
  let message;
  let category;
  let app;

  beforeAll(async () => {
    mongoose
      .connect(process.env.MONGODB_TEST_URI)
      .then(() => console.log("MongoDB connected..."))
      .catch((err) => console.error("MongoDB connection error:", err));

    const server = new Server(new Router());
    app = server.getApp();

    user = await createUserWithEmailAndPassword();
    category = await createCategory();
    service = await createService(category._id);
    group = await createGroup(service, user, [user]);
  }, 100000);

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Group.deleteMany({});
    await Service.deleteMany({});
    await mongoose.disconnect();
  }, 100000);

  beforeEach(async () => {
    await AuthToken.deleteMany({});
    await OTP.deleteMany({});
    await Message.deleteMany({});
    await NotificationModel.deleteMany({});
    jest.clearAllMocks();

    // Mock the processQueue.add function
    processQueueManager.getProcessQueue.mockReturnValue({
      add: jest.fn(),
    });

    authToken = await createAuthToken(user);
    message = await createMessage(group, user);
  }, 100000);

  afterEach(async () => {
    await AuthToken.deleteMany({});
    await OTP.deleteMany({});
    await Message.deleteMany({});
  }, 100000);

  describe("GET /messages/group/:groupId", () => {
    it("should return a list of messages for the group", async () => {
      const res = await request(app)
        .get(`/api/chat/messages/group/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data.messages).toBeDefined();
      expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1);
    });

    it("should return 404 if group not found", async () => {
      const res = await request(app)
        .get("/api/chat/messages/group/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("should return 404 if user is not a member of the group", async () => {
      const otherUser = await createUserWithEmailAndPassword(
        "otheruser@example.com",
        "OtherUser"
      );
      const otherAuthToken = await createAuthToken(otherUser);
      const res = await request(app)
        .get(`/api/chat/messages/group/${group._id.toString()}`)
        .set("Authorization", `Bearer ${otherAuthToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("user is not a member of this group");
    });
  });

  describe("GET /messages/unread-count/:groupId", () => {
    it("should return the unread messages count for the group", async () => {
      const res = await request(app)
        .get(`/api/chat/messages/unread-count/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data.count).toBeGreaterThanOrEqual(0);
    });

    it("should return 404 if group not found", async () => {
      const res = await request(app)
        .get("/api/chat/messages/unread-count/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("should return 404 if user is not a member of the group", async () => {
      const otherUser = await createUserWithEmailAndPassword(
        "otheruser2@example.com",
        "OtherUser2"
      );
      const otherAuthToken = await createAuthToken(otherUser);
      const res = await request(app)
        .get(`/api/chat/messages/unread-count/${group._id.toString()}`)
        .set("Authorization", `Bearer ${otherAuthToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("user is not a member of this group");
    });
  });

  describe("PATCH /messages/mark-as-read", () => {
    it("should mark all messages as read for the group", async () => {
      const res = await request(app)
        .patch("/api/chat/messages/mark-as-read")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ groupId: group._id });

      expect(res.body.message).toBe("successful");
      expect(res.status).toBe(200);

      const unreadCount = await Message.getUnreadMessagesCountByGroup(
        user._id,
        group._id
      );
      expect(unreadCount).toBe(0);
    });

    it("should mark specified messages as read", async () => {
      const message2 = await createMessage(group, user);

      const res = await request(app)
        .patch("/api/chat/messages/mark-as-read")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          messageIds: [message._id.toString(), message2._id.toString()],
        });

      expect(res.body.message).toBe("successful");
      expect(res.status).toBe(200);

      const unreadCount = await Message.getUnreadMessagesCountByGroup(
        user._id,
        group._id
      );
      expect(unreadCount).toBe(0);
    });
  });
});

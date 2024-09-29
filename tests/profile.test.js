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

describe("Profile API Endpoints", () => {
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
    group = await createGroup(service, user);
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

  describe("GET /avatars", () => {
    it("should return all available avatars", async () => {
      const res = await request(app)
        .get("/api/profile/avatars")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Avatars retrieved successfully");
      expect(res.body.data.avatars).toBeDefined();
      expect(res.body.data.avatars.length).toBeGreaterThan(0);
    });
  }, 100000);

  describe("PUT /update-avatar", () => {
    it("should update the user's avatar", async () => {
      const newAvatarUrl = "https://example.com/new-avatar.jpg";
      const res = await request(app)
        .put("/api/profile/update-avatar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ avatarUrl: newAvatarUrl });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Avatar has been updated");
      expect(res.body.data.avatarUrl).toBe(newAvatarUrl);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.avatarUrl).toBe(newAvatarUrl);
    });

    it("should return 400 if avatarUrl is missing", async () => {
      const res = await request(app)
        .put("/api/profile/update-avatar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("avatarUrl is required");
    });
  }, 100000);

  describe("PUT /update-username-email", () => {
    it("should update the user's username and email", async () => {
      const newUsername = "newusername";
      const newEmail = "new@example.com";
      const res = await request(app)
        .put("/api/profile/update-username-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ username: newUsername, email: newEmail });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Username/Email updated successfully");
      expect(res.body.data.username).toBe(newUsername);
      expect(res.body.data.email).toBe(newEmail);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.username).toBe(newUsername);
      expect(updatedUser.email).toBe(newEmail);
    });

    it("should return 400 if username already exists", async () => {
      const existingUsername = "existingusername";
      const existingUser = await User.create({
        email: "existing@example.com",
        password: "testpassword",
        username: existingUsername,
        avatarUrl: "https://avatar.com",
      });

      const res = await request(app)
        .put("/api/profile/update-username-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ username: existingUsername, email: "nonexisting@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("username already exists");
    });

    it("should return 400 if email already exists", async () => {
      const existingEmail = "existing1@example.com";
      const existingUser = await User.create({
        email: existingEmail,
        password: "testpassword",
        username: "existingusername1",
        avatarUrl: "https://avatar.com",
      });

      const res = await request(app)
        .put("/api/profile/update-username-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ email: existingEmail, username: "nonexistingusername" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("username already exists");
    });

    it("should return 400 if username is missing", async () => {
      const res = await request(app)
        .put("/api/profile/update-username-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ email: "new@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("provide username");
    });
  }, 100000);

  describe("PUT /change-password", () => {
    it("should change the user's password", async () => {
      const currentPassword = "testpassword";
      const newPassword = "newpassword";
      const res = await request(app)
        .put("/api/profile/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ currentPassword, newPassword });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password changed successfully");

      const updatedUser = await User.findById(user._id);
      const isPasswordValid = await comparePassword(
        newPassword,
        updatedUser.password
      );
      expect(isPasswordValid).toBe(true);
    });

    it("should return 400 if current password is incorrect", async () => {
      const currentPassword = "wrongpassword";
      const newPassword = "newpassword";
      const res = await request(app)
        .put("/api/profile/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ currentPassword, newPassword });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Incorrect current password.");
    });

    it("should return 400 if currentPassword is missing", async () => {
      const newPassword = "newpassword";
      const res = await request(app)
        .put("/api/profile/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newPassword });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("provide current password");
    });

    it("should return 400 if newPassword is missing", async () => {
      const currentPassword = "testpassword";
      const res = await request(app)
        .put("/api/profile/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ currentPassword });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("provide new password");
    });
  }, 100000);

  describe("DELETE /delete-user", () => {
    it("should delete the user's account", async () => {
      const existingUser = await User.create({
        email: "existingd@example.com",
        password: "testpassword",
        username: "existingUsername11",
        avatarUrl: "https://avatar.com",
      });
      const existingUserAuthToken = await createAuthToken(existingUser);
      const res = await request(app)
        .delete("/api/profile/delete-user")
        .set("Authorization", `Bearer ${existingUserAuthToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("You have deleted your account");

      const deletedUser = await User.findById(existingUser._id);
      expect(deletedUser).toBeNull();
    }, 100000);
  }, 100000);

  describe("GET /notification-config", () => {
    it("should return the user's notification configuration", async () => {
      const res = await request(app)
        .get("/api/profile/notification-config")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe(
        "Notification configuration retrieved successfully"
      );
      expect(res.body.data).toBeDefined();
    });
  }, 100000);

  describe("PATCH /notification-config", () => {
    it("should update the user's notification configuration", async () => {
      const updatedConfig = {
        loginAlert: false,
        passwordChanges: true,
      };
      const res = await request(app)
        .patch("/api/profile/notification-config")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updatedConfig);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("update successful");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.notificationConfig.loginAlert).toBe(false);
      expect(updatedUser.notificationConfig.passwordChanges).toBe(true);
    });
  }, 100000);

  describe("GET /notifications", () => {
    it("should return the user's notifications", async () => {
      const notification = await NotificationModel.createNotification({
        subject: "Test Notification",
        textContent: "Test notification content",
        htmlContent: "<p>Test notification content</p>",
        userId: user._id,
      });

      const res = await request(app)
        .get("/api/profile/notifications")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  }, 100000);

  describe("GET /notifications/:id", () => {
    it("should return the specific notification", async () => {
      const notification = await NotificationModel.createNotification({
        subject: "Test Notification",
        textContent: "Test notification content",
        htmlContent: "<p>Test notification content</p>",
        userId: user._id,
      });

      const res = await request(app)
        .get(`/api/profile/notifications/${notification._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toBeDefined();
      expect(res.body.data._id.toString()).toBe(notification._id.toString());
    });

    it("should return 404 if notification not found", async () => {
      const res = await request(app)
        .get("/api/profile/notifications/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("notification not found");
    });
  }, 100000);

  describe("PATCH /notifications/mark-as-read", () => {
    it("should mark the specified notifications as read", async () => {
      const notification1 = await NotificationModel.createNotification({
        subject: "Test Notification 1",
        textContent: "Test notification content 1",
        htmlContent: "<p>Test notification content 1</p>",
        userId: user._id,
      });
      const notification2 = await NotificationModel.createNotification({
        subject: "Test Notification 2",
        textContent: "Test notification content 2",
        htmlContent: "<p>Test notification content 2</p>",
        userId: user._id,
      });

      const res = await request(app)
        .patch("/api/profile/notifications/mark-as-read")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ids: [notification1._id.toString(), notification2._id.toString()],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");

      const updatedNotification1 = await NotificationModel.findById(
        notification1._id
      );
      const updatedNotification2 = await NotificationModel.findById(
        notification2._id
      );

      expect(updatedNotification1.read).toBe(true);
      expect(updatedNotification2.read).toBe(true);
    });
  }, 100000);

  describe("PATCH /notifications/mark-as-read/all", () => {
    it("should mark all the user's notifications as read", async () => {
      await NotificationModel.createNotification({
        subject: "Test Notification 1",
        textContent: "Test notification content 1",
        htmlContent: "<p>Test notification content 1</p>",
        userId: user._id,
      });
      await NotificationModel.createNotification({
        subject: "Test Notification 2",
        textContent: "Test notification content 2",
        htmlContent: "<p>Test notification content 2</p>",
        userId: user._id,
      });

      const res = await request(app)
        .patch("/api/profile/notifications/mark-as-read/all")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");

      const notifications = await NotificationModel.find({ user: user._id });
      for (const notification of notifications) {
        expect(notification.read).toBe(true);
      }
    });
  }, 100000);
});

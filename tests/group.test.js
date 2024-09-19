const mongoose = require("mongoose");
const request = require("supertest");
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
  createAdminUserWithEmailAndPassword,
  createGroup,
  createService,
  createMessage,
  createAuthToken,
  createOTP,
  createCategory,
} = require("./test-utils");
const processQueueManager = require("../processQueue");
const OTPModel = require("../models/otp");
const PaymentInvoiceService = require("../notification/payment_invoice");
const NotificationService = require("../notification/index");
const ChatRoomModel = require("../models/chatroom");
const PaymentModel = require("../models/payment");
const InAppNotificationService = require("../notification/inapp");
const FirebaseService = require("../notification/firebase");

jest.mock("../processQueue", () => ({
  getProcessQueue: jest.fn(),
}));

jest.mock("../notification/brevo", () => ({
  sendEmailWithBrevo: jest.fn(),
}));

jest.mock("../notification/payment_invoice", () => ({
  sendToGroup: jest.fn(),
  generateInvoice: jest.fn(),
  handleSendInvoiceProcess: jest.fn(),
}));

jest.mock("../notification/inapp", () => ({
  sendNotification: jest.fn(),
  getNotification: jest.fn(),
  handleNotificationProcess: jest.fn(),
}));

jest.mock("../notification/firebase", () => ({
  sendNotification: jest.fn(),
  sendNotificationToTopic: jest.fn(),
}));

describe("Group API Endpoints", () => {
  let user;
  let adminUser;
  let authToken;
  let adminAuthToken;
  let service;
  let group;
  let message;
  let category;
  let otp;
  let passOtp;
  let app;
  let chatRoom;
  let payment;

  beforeAll(async () => {
    mongoose
      .connect(process.env.MONGODB_TEST_URI)
      .then(() => console.log("MongoDB connected..."))
      .catch((err) => console.error("MongoDB connection error:", err));

    const server = new Server(new Router());
    app = server.getApp();

    adminUser = await createAdminUserWithEmailAndPassword(
      "testgroup1@example.com",
      "TestGroupUser1"
    );
    user = await createUserWithEmailAndPassword(
      "testgroup2@example.com",
      "TestGroupUser2"
    );
    category = await createCategory();
    service = await createService(category._id);
    group = await createGroup(service, user, [user]);
    chatRoom = await ChatRoomModel.createChatRoom({
      groupId: group._id,
      members: [user._id],
    });
    payment = await PaymentModel.createPayment({
      reference: "testref",
      userId: user._id,
      groupId: group._id,
      amount: 10,
      disbursed: false,
      currency: "USD",
    });
  }, 100000);

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Group.deleteMany({});
    await Service.deleteMany({});
    await Message.deleteMany({});
    await AuthToken.deleteMany({});
    await OTP.deleteMany({});
    await ChatRoomModel.deleteMany({});
    await PaymentModel.deleteMany({});
    await mongoose.disconnect();
  }, 100000);

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock the processQueue.add function
    processQueueManager.getProcessQueue.mockReturnValue({
      add: jest.fn(),
    });

    authToken = await createAuthToken(user);
    adminAuthToken = await createAuthToken(adminUser);
    message = await createMessage(group, user);
    otp = await createOTP(user, "emailVerification");
    passOtp = await OTPModel.createNumberOTP(user._id, "passwordReset", 6);
  }, 100000);

  afterEach(async () => {
    await AuthToken.deleteMany({});
    await OTP.deleteMany({});
    await Message.deleteMany({});
  }, 100000);

  describe("POST /groups/create", () => {
    it("should successfully create a new group", async () => {
      const groupName = "Test Group 2";
      const subscriptionCost = 20;
      const numberOfMembers = 3;
      const oneTimePayment = false;
      const existingGroup = false;
      const nextSubscriptionDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 30
      );

      const res = await request(app)
        .post("/api/groups/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          serviceId: service._id.toString(),
          groupName,
          subscriptionCost,
          numberOfMembers,
          oneTimePayment,
          existingGroup,
          nextSubscriptionDate,
        });

      expect(res.body.message).toBe("successful");
      expect(res.status).toBe(201);
      expect(res.body.data.groupName).toBe(groupName);
      expect(res.body.data.subscriptionCost).toBe(subscriptionCost);
      expect(res.body.data.numberOfMembers).toBe(numberOfMembers);
      expect(res.body.data.oneTimePayment).toBe(oneTimePayment);
      expect(res.body.data.existingGroup).toBe(existingGroup);
      expect(res.body.data.nextSubscriptionDate).toBeDefined();
    });

    it("should return 400 if number of members is less than 2 or greater than 6", async () => {
      const groupName = "Test Group 2";
      const subscriptionCost = 20;
      const numberOfMembers = 1;
      const oneTimePayment = false;
      const existingGroup = false;
      const nextSubscriptionDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 30
      );

      const res = await request(app)
        .post("/api/groups/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          serviceId: service._id.toString(),
          groupName,
          subscriptionCost,
          numberOfMembers,
          oneTimePayment,
          existingGroup,
          nextSubscriptionDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Number of members must be between 2 and 6."
      );
    });

    it("should return 404 if service not found", async () => {
      const groupName = "Test Group 2";
      const subscriptionCost = 20;
      const numberOfMembers = 3;
      const oneTimePayment = false;
      const existingGroup = false;
      const nextSubscriptionDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 30
      );

      const res = await request(app)
        .post("/api/groups/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          serviceId: "invalid_service_id",
          groupName,
          subscriptionCost,
          numberOfMembers,
          oneTimePayment,
          existingGroup,
          nextSubscriptionDate,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Service not found");
    });
  }, 100000);

  describe("PATCH /groups/update-subscription-cost/:groupId", () => {
    it("should successfully update the subscription cost of a group", async () => {
      const newSubscriptionCost = 30;

      const res = await request(app)
        .patch(`/api/groups/update-subscription-cost/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newSubscriptionCost });

      expect(res.body.message).toBe("Subscription cost updated successfully");
      expect(res.status).toBe(200);
      expect(res.body.data.subscriptionCost).toBe(newSubscriptionCost);
    });

    it("should return 400 if invalid subscription cost is provided", async () => {
      const newSubscriptionCost = -10;

      const res = await request(app)
        .patch(`/api/groups/update-subscription-cost/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newSubscriptionCost });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid subscription cost");
    });

    it("should return 404 if group not found", async () => {
      const newSubscriptionCost = 30;

      const res = await request(app)
        .patch(`/api/groups/update-subscription-cost/invalid_group_id`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ newSubscriptionCost });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("should return 403 if user is not the group admin", async () => {
      const newSubscriptionCost = 30;

      const res = await request(app)
        .patch(`/api/groups/update-subscription-cost/${group._id.toString()}`)
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({ newSubscriptionCost });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Only the group admin can update the subscription cost"
      );
    });
  }, 100000);

  describe("GET /groups/by-service/:service_id", () => {
    it("should successfully fetch groups by service ID", async () => {
      const res = await request(app)
        .get(`/api/groups/by-service/${service._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Groups fetched successfully");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should return 404 if service not found", async () => {
      const res = await request(app)
        .get("/api/groups/by-service/invalid_service_id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Service not found");
    });
  }, 100000);

  describe("GET /groups", () => {
    it("should successfully fetch groups", async () => {
      const res = await request(app)
        .get("/api/groups")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Groups fetched successfully");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  }, 100000);

  describe("GET /groups/grouplist", () => {
    it("should successfully fetch group list", async () => {
      const res = await request(app)
        .get("/api/groups/grouplist")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Groups fetched successfully");
      expect(res.body.data.groups).toBeDefined();
      expect(res.body.data.groups.length).toBeGreaterThanOrEqual(1);
    });
  }, 100000);

  describe("POST /groups/join", () => {
    it("should successfully send a request to join a group", async () => {
      const groupCode = "TESTGROUP";
      const message = "Please let me join!";

      const res = await request(app)
        .post("/api/groups/join")
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({ groupCode, message });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Request to join group sent successfully");
    }, 100000);

    it("should return 404 if group not found", async () => {
      const groupCode = "INVALID_GROUP_CODE";
      const message = "Please let me join!";

      const res = await request(app)
        .post("/api/groups/join")
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({ groupCode, message });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    }, 100000);

    it("should return 400 if user is already a member of the group", async () => {
      const groupCode = "TESTGROUP";
      const message = "Please let me join!";

      const res = await request(app)
        .post("/api/groups/join")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ groupCode, message });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("You are already a member of this group");
    }, 100000);

    it("should return 400 if group is full", async () => {
      const groupCode = "TESTGROUP";
      const message = "Please let me join!";
      const euser = await createUserWithEmailAndPassword(
        "testgroup3@example.com",
        "TestGroupUser3"
      );
      const eauthToken = await createAuthToken(euser);

      const euser1 = await createUserWithEmailAndPassword(
        "testgroup4@example.com",
        "TestGroupUser4"
      );

      // Add a second member to make the group full
      await Group.findByIdAndUpdate(group._id, {
        members: [
          { user: euser1._id },
          { user: user._id }, // User is already a member
        ],
      });

      const res = await request(app)
        .post("/api/groups/join")
        .set("Authorization", `Bearer ${eauthToken}`)
        .send({ groupCode, message });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Group is full");
    }, 100000);

    it("should return 400 if user already has a pending join request", async () => {
      const groupCode = "TESTGROUP";
      const message = "Please let me join!";

      await Group.findByIdAndUpdate(group._id, {
        members: [{ user: user._id }],
        joinRequests: [{ user: adminUser._id, message: "Previous Request" }],
      });

      const res = await request(app)
        .post("/api/groups/join")
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({ groupCode, message });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "You already have a pending request. Please wait for the admin to accept you."
      );
    }, 100000);
  }, 100000);

  describe("POST /groups/handle-join-request", () => {
    it("should successfully handle a join request (approve)", async () => {
      const userId = user._id.toString();
      const groupId = group._id.toString();

      await Group.findByIdAndUpdate(group._id, {
        members: [{ user: user._id }],
        joinRequests: [{ user: adminUser._id, message: "Previous Request" }],
      });

      const res = await request(app)
        .post("/api/groups/handle-join-request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ groupId, userId: adminUser._id, approve: true });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User join request approved");
    });

    it("should successfully handle a join request (reject)", async () => {
      const userId = user._id.toString();
      const groupId = group._id.toString();

      await Group.findByIdAndUpdate(group._id, {
        members: [{ user: user._id }],
        joinRequests: [{ user: adminUser._id, message: "Previous Request" }],
      });

      const res = await request(app)
        .post("/api/groups/handle-join-request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ groupId, userId: adminUser._id, approve: false });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User join request rejected");
    });

    it("should return 404 if group not found", async () => {
      const userId = user._id.toString();
      const groupId = "invalid_group_id";

      const res = await request(app)
        .post("/api/groups/handle-join-request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ groupId, userId, approve: true });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("should return 403 if user is not the group admin", async () => {
      const userId = user._id.toString();
      const groupId = group._id.toString();

      const res = await request(app)
        .post("/api/groups/handle-join-request")
        .set("Authorization", `Bearer ${adminAuthToken}`)
        .send({ groupId, userId, approve: true });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Only the group admin can handle join requests"
      );
    });

    it("should return 404 if join request not found", async () => {
      const userId = adminUser._id.toString();
      const groupId = group._id.toString();

      const res = await request(app)
        .post("/api/groups/handle-join-request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ groupId, userId, approve: true });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Join request not found");
    });
  }, 100000);

  describe("GET /groups/join-requests/:groupId", () => {
    it("should successfully fetch join requests for a group", async () => {
      // Add a join request to the group
      await Group.findByIdAndUpdate(group._id, {
        joinRequests: [{ user: adminUser._id, message: "Please let me in!" }],
      });

      const res = await request(app)
        .get(`/api/groups/join-requests/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("retreived pending requests");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should return 404 if group not found", async () => {
      const res = await request(app)
        .get("/api/groups/join-requests/invalid_group_id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("should return 403 if user is not the group admin", async () => {
      const res = await request(app)
        .get(`/api/groups/join-requests/${group._id.toString()}`)
        .set("Authorization", `Bearer ${adminAuthToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Only the group admin can view join requests"
      );
    });

    it("should return 200 with empty array if no pending join requests", async () => {
      await Group.findByIdAndUpdate(group._id, {
        joinRequests: [],
      });
      const res = await request(app)
        .get(`/api/groups/join-requests/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("No pending join requests");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(0);
    });
  }, 100000);

  describe("GET /groups/by-code/:groupCode", () => {
    it("should successfully fetch group details by group code", async () => {
      const groupCode = "TESTGROUP";

      const res = await request(app)
        .get(`/api/groups/by-code/${groupCode}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.groupName).toBe("Test Group");
    });

    it("should return 404 if group not found", async () => {
      const groupCode = "INVALID_GROUP_CODE";

      const res = await request(app)
        .get(`/api/groups/by-code/${groupCode}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });
  }, 100000);

  describe("GET /groups/:groupId", () => {
    it("should successfully fetch group details by group ID", async () => {
      const res = await request(app)
        .get(`/api/groups/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.groupName).toBe("Test Group");
    });

    it("should return 404 if group not found", async () => {
      const res = await request(app)
        .get("/api/groups/invalid_group_id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });
  }, 100000);

  describe("POST /groups/leave/:groupId", () => {
    it("should successfully allow a user to leave a group", async () => {
      // Add the user to the group before attempting to leave
      await Group.findByIdAndUpdate(group._id, {
        members: [{ user: adminUser._id }, { user: user._id }],
      });

      const res = await request(app)
        .post(`/api/groups/leave/${group._id.toString()}`)
        .set("Authorization", `Bearer ${adminAuthToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Successfully left the group");
      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
    });

    it("should return 404 if group not found", async () => {
      const res = await request(app)
        .post("/api/groups/leave/invalid_group_id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("should return 403 if user is the group admin", async () => {
      const res = await request(app)
        .post(`/api/groups/leave/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Admin cannot leave the group");
    });

    it("should return 400 if user is not a member of the group", async () => {
      const res = await request(app)
        .post(`/api/groups/leave/${group._id.toString()}`)
        .set("Authorization", `Bearer ${adminAuthToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("You are not a member of this group");
    });
  }, 100000);

  describe("POST /groups/confirm-status/:groupId/:action", () => {
    it("should successfully update confirm status (confirm)", async () => {
      // Add the user to the group before attempting to confirm
      await Group.findByIdAndUpdate(group._id, {
        members: [
          { user: adminUser._id, confirmStatus: false },
          { user: user._id, confirmStatus: false },
        ],
      });

      const res = await request(app)
        .post(`/api/groups/confirm-status/${group._id.toString()}/confirm`)
        .set("Authorization", `Bearer ${adminAuthToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successfully updated status");
    });

    it("should successfully update confirm status (unconfirm)", async () => {
      // Add the user to the group before attempting to confirm
      await Group.findByIdAndUpdate(group._id, {
        members: [
          { user: adminUser._id, confirmStatus: true },
          { user: user._id, confirmStatus: true },
        ],
      });

      const res = await request(app)
        .post(`/api/groups/confirm-status/${group._id.toString()}/unconfirm`)
        .set("Authorization", `Bearer ${adminAuthToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successfully updated status");
    });

    it("should return 404 if group not found", async () => {
      const res = await request(app)
        .post("/api/groups/confirm-status/invalid_group_id/confirm")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("should return 404 if invalid action", async () => {
      const res = await request(app)
        .post(
          `/api/groups/confirm-status/${group._id.toString()}/invalid_action`
        )
        .set("Authorization", `Bearer ${adminAuthToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("page not found");
    });
  }, 100000);

  describe("POST /groups/activate/:groupId", () => {
    it("should successfully activate a group", async () => {
      // Set group to inactive before attempting to activate
      await Group.findByIdAndUpdate(group._id, {
        activated: false,
        members: [{ user: user._id, confirmStatus: true }],
      });

      const res = await request(app)
        .post(`/api/groups/activate/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("invoices sent");
      expect(PaymentInvoiceService.sendToGroup).toHaveBeenCalled();
    });

    it("should return 404 if group not found", async () => {
      const res = await request(app)
        .post("/api/groups/activate/invalid_group_id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });

    it("should return 403 if user is not the group admin", async () => {
      const res = await request(app)
        .post(`/api/groups/activate/${group._id.toString()}`)
        .set("Authorization", `Bearer ${adminAuthToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Only the group admin can activate the group"
      );
    });

    it("should return 400 if group is already activated", async () => {
      const res = await request(app)
        .post(`/api/groups/activate/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Group is already activated");
    });
  }, 100000);

  describe("DELETE /groups/:id", () => {
    it("should return 403 if user is not the group admin", async () => {
      const res = await request(app)
        .delete(`/api/groups/${group._id.toString()}`)
        .set("Authorization", `Bearer ${adminAuthToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only the group admin can delete group");
    });
    it("should successfully delete a group", async () => {
      const res = await request(app)
        .delete(`/api/groups/${group._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("delete successful");
    });

    it("should return 404 if group not found", async () => {
      const res = await request(app)
        .delete("/api/groups/invalid_group_id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Group not found");
    });
  }, 100000);
});

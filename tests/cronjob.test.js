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
const NotificationService = require("../notification/index");
const FirebaseService = require("../notification/firebase");
const BankDetails = require("../models/bankdetails");
const PaymentModel = require("../models/payment");
const Flutterwave = require("../utils/flutterwave");
const { BuildHttpResponse } = require("../utils/response");
const { getPaginatedResults } = require("../utils/pagination");

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

jest.mock("../utils/flutterwave", () => ({
  verify: jest.fn().mockResolvedValue({
    status: true,
    message: "Verification successful",
    transaction_info: {
      amount: 10,
      currency: "NGN",
      status: "SUCCESSFUL",
    },
  }),
  getBanks: jest.fn().mockResolvedValue([]),
  initTransfer: jest.fn().mockResolvedValue({
    status: true,
    message: "Transfer Queued Successfully",
    id: 12345, // Mock transfer ID
    reference: "test-reference",
    gateway: "flutterwave",
  }),
  fetchTransfer: jest.fn().mockResolvedValue({
    status: true,
    statusString: "SUCCESSFUL",
    message: "Transfer fetched",
    id: 12345, // Mock transfer ID
    meta: {},
    transaction_info: {
      status: "SUCCESSFUL",
    },
  }),
}));

describe("Cronjob API Endpoints", () => {
  let user;
  let authToken;
  let service;
  let group;
  let message;
  let category;
  let app;
  let euser;
  let eauthToken;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(async () => {
    mongoose
      .connect(process.env.MONGODB_TEST_URI)
      .then(() => console.log("MongoDB connected..."))
      .catch((err) => console.error("MongoDB connection error:", err));

    const server = new Server(new Router());
    app = server.getApp();

    user = await createUserWithEmailAndPassword("test6@example.com", "test6");
    euser = await createUserWithEmailAndPassword(
      "test61@example.com",
      "test61"
    );

    category = await createCategory();
    service = await createService(category._id);
    group = await createGroup(service, user, [user]);
  }, 100000);

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Group.deleteMany({});
    await Service.ServiceModel.deleteMany({});
    await BankDetails.deleteMany({});
    await PaymentModel.deleteMany({});
    await mongoose.disconnect();
  }, 100000);

  beforeEach(async () => {
    await PaymentModel.deleteMany({});
    await BankDetails.deleteMany({});
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
    eauthToken = await createAuthToken(euser);
    message = await createMessage(group, user, [user, euser]);
  }, 100000);

  afterEach(async () => {
    await AuthToken.deleteMany({});
    await OTP.deleteMany({});
    await Message.deleteMany({});
  }, 100000);

  const bankDetailsData = {
    accountName: "Test Account",
    bankName: "Test Bank",
    accountNumber: "1234567890",
    sortCode: "12-34-56",
  };

  describe("GET /recurring-invoices", () => {
    const daysToAdd = Math.floor(Math.random() * 5) + 1;
    it("should send recurring invoices to group members", async () => {
      const { _id, ...groupData } = group.toObject();
      let newgroup = await Group.create({
        ...groupData,
        groupCode: "TESTGROUPNEW",
        nextSubscriptionDate: new Date(
          Date.now() + daysToAdd * 24 * 60 * 60 * 1000
        ),
      });
      const res = await request(app).get("/jobs/recurring-invoices");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");

      const expectedDate = new Date(
        newgroup.nextSubscriptionDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      newgroup = await Group.findById(newgroup?._id);
      const newDate = newgroup.nextSubscriptionDate;
      expect(newDate.getTime()).toBeCloseTo(
        expectedDate.getTime(),
        -3 // Comparing to the nearest second (ignoring millisecond differences)
      );
      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
    }, 10000);
  }, 10000);

  describe("GET /check-members-payments", () => {
    it("should remove inactive members from groups and send notifications", async () => {
      // Create an inactive member
      const inactiveMember = await createUserWithEmailAndPassword(
        "inactive@example.com",
        "inactiveUser"
      );
      const inactiveMemberAuthToken = await createAuthToken(inactiveMember);

      // Add inactive member to group
      group.members.push({
        user: inactiveMember._id,
        subscriptionStatus: "active",
        paymentActive: false,
        lastInvoiceSentAt: new Date(Date.now() - 1000 * 60 * 60 * 49), // Set lastInvoiceSentAt to be past the deadline
      });
      await group.save();

      // Call the endpoint
      const res = await request(app).get("/jobs/check-members-payments");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");

      // Check if inactive member was removed
      const updatedGroup = await Group.findById(group._id);

      expect(
        updatedGroup.members.some(
          (member) => member.user.toString() === inactiveMember._id.toString()
        )
      ).toBe(false);

      // Check if notifications were sent
      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
    }, 10000);
  });

  describe("GET /inactive-members-reminder", () => {
    // const oneMinuteInMs = 60 * 1000;
    const twelveHrsInMs = 60 * 60 * 1000 * 12;
    const randomOffset =
      Math.floor(Math.random() * 2 * twelveHrsInMs) - twelveHrsInMs; // Random offset between -1 minute and +1 minute
    it("should send payment reminders to inactive members and group creators", async () => {
      // Create an inactive member
      const inactiveMember = await createUserWithEmailAndPassword(
        "inactive2@example.com",
        "inactiveUser2"
      );
      const inactiveMemberAuthToken = await createAuthToken(inactiveMember);

      // Add inactive member to group
      group.members.push({
        user: inactiveMember._id,
        subscriptionStatus: "active",
        paymentActive: false,
        lastInvoiceSentAt: new Date(
          Date.now() - 1000 * 60 * 60 * 24 + randomOffset
        ), // Set lastInvoiceSentAt to be 24 hours ago
      });
      await group.save();

      // Call the endpoint
      const res = await request(app).get("/jobs/inactive-members-reminder");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");

      // Check if notifications were sent
      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
    }, 10000);
  });

  describe("GET /group-creator-disbursements", () => {
    it("should initiate disbursement to group creators", async () => {
      await Group.findByIdAndUpdate(group._id, {
        members: [
          {
            user: user._id,
            subscriptionStatus: "active",
            paymentActive: true,
            confirmStatus: true,
            lastInvoiceSentAt: new Date(Date.now() - 1000 * 60 * 60 * 49),
          },
          {
            user: euser._id,
            subscriptionStatus: "active",
            paymentActive: true,
            confirmStatus: true,
            lastInvoiceSentAt: new Date(Date.now() - 1000 * 60 * 60 * 49),
          },
        ],
      });
      const bankDetails = await BankDetails.createBankDetails({
        user: user._id,
        ...bankDetailsData,
      });

      // Create a payment for the group
      const payment = await PaymentModel.createPayment({
        reference: "test-payment-reference",
        userId: user._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });
      const payment1 = await PaymentModel.createPayment({
        reference: "test-payment-reference-1",
        userId: euser._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });

      // Set the payment as successful and not-disbursed
      await payment.updateStatus("successful");
      await payment1.updateStatus("successful");

      // Call the endpoint
      const res = await request(app).get("/jobs/group-creator-disbursements");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");
      await delay(1000);
      const ppayment = await PaymentModel.findById(payment?._id);
      const ppayment1 = await PaymentModel.findById(payment1?._id);
      expect(ppayment.disbursed).toBe("pending");
      expect(ppayment1.disbursed).toBe("pending");
    }, 10000);

    it("should handle cases where bank details are not found", async () => {
      const res = await request(app).get("/jobs/group-creator-disbursements");
      // Create a payment for the group
      const payment = await PaymentModel.createPayment({
        reference: "test-payment-reference",
        userId: user._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });
      const payment1 = await PaymentModel.createPayment({
        reference: "test-payment-reference-1",
        userId: euser._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });

      // Set the payment as successful and not-disbursed
      await payment.updateStatus("successful");
      await payment1.updateStatus("successful");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");

      await delay(1000);
      const ppayment = await PaymentModel.findById(payment?._id);
      const ppayment1 = await PaymentModel.findById(payment1?._id);
      expect(ppayment.disbursed).toBe("not-disbursed");
      expect(ppayment1.disbursed).toBe("not-disbursed");
    });
  });

  describe("GET /verify-disbursements", () => {
    it("should verify pending disbursements", async () => {
      // Create a payment and set its disbursement status to pending
      const payment = await PaymentModel.createPayment({
        reference: "test-payment-reference",
        userId: user._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });

      await payment.updateDisbursedStatusAndId(12345, "pending");

      // Call the endpoint
      const res = await request(app).get("/jobs/verify-disbursements");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");

      await delay(1000);
      const ppayment = await PaymentModel.findById(payment?._id);
      expect(ppayment.disbursed).toBe("successful");
    });

    it("should handle cases where disbursement failed", async () => {
      // Create a payment and set its disbursement status to pending
      const payment = await PaymentModel.createPayment({
        reference: "test-payment-reference",
        userId: user._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });

      await payment.updateDisbursedStatusAndId(12345, "pending");

      // Mock Flutterwave.fetchTransfer to return failed status
      jest.spyOn(Flutterwave, "fetchTransfer").mockResolvedValueOnce({
        status: false,
        statusString: "FAILED",
        message: "Transfer failed",
        id: 12345,
        meta: {},
        transaction_info: {
          status: "FAILED",
        },
      });

      // Call the endpoint
      const res = await request(app).get("/jobs/verify-disbursements");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");

      await delay(1000);
      const ppayment = await PaymentModel.findById(payment?._id);
      expect(ppayment.disbursed).toBe("not-disbursed");
    });
  });
});

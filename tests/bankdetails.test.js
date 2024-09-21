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
}));

describe("Bank Details API Endpoints", () => {
  let user;
  let authToken;
  let service;
  let group;
  let message;
  let category;
  let app;
  let euser;
  let eauthToken;

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
    await Service.deleteMany({});
    await BankDetails.deleteMany({});
    await PaymentModel.deleteMany({});
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
    eauthToken = await createAuthToken(euser);
    message = await createMessage(group, user);
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

  describe("POST /bank-details/", () => {
    it("should create bank details for the user", async () => {
      const res = await request(app)
        .post("/api/bank-details/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(bankDetailsData);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Bank details added successfully");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.accountName).toBe(bankDetailsData.accountName);
      expect(res.body.data.bankName).toBe(bankDetailsData.bankName);
      expect(res.body.data.accountNumber).toBe(bankDetailsData.accountNumber);
      expect(res.body.data.sortCode).toBe(bankDetailsData.sortCode);

      const createdBankDetails = await BankDetails.findOne({
        user: user._id,
      });

      expect(createdBankDetails).toBeDefined();
      expect(createdBankDetails.accountName).toBe(bankDetailsData.accountName);
      expect(createdBankDetails.bankName).toBe(bankDetailsData.bankName);
      expect(createdBankDetails.accountNumber).toBe(
        bankDetailsData.accountNumber
      );
      expect(createdBankDetails.sortCode).toBe(bankDetailsData.sortCode);
    });

    it("should return 400 if bank details already exist for the user", async () => {
      const res = await request(app)
        .post("/api/bank-details/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(bankDetailsData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Bank details already exist for this user");
    });
  }, 10000);

  describe("GET /bank-details/:userId", () => {
    it("should return bank details for the specified user", async () => {
      const res = await request(app)
        .get(`/api/bank-details/${user._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.body.message).toBe("Bank details retrieved successfully");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.accountName).toBe(bankDetailsData.accountName);
      expect(res.body.data.bankName).toBe(bankDetailsData.bankName);
      expect(res.body.data.accountNumber).toBe(bankDetailsData.accountNumber);
      expect(res.body.data.sortCode).toBe(bankDetailsData.sortCode);
    }, 10000);

    it("should return 404 if bank details are not found for the user", async () => {
      const res = await request(app)
        .get(`/api/bank-details/${euser._id.toString()}`)
        .set("Authorization", `Bearer ${eauthToken}`);

      expect(res.body.message).toBe("Bank details not found");
      expect(res.status).toBe(404);
    }, 10000);
  }, 10000);

  describe("PATCH /bank-details/:userId", () => {
    it("should update bank details for the specified user", async () => {
      user.role = "admin";
      await user.save();
      const updatedBankDetailsData = {
        accountName: "Updated Test Account",
        bankName: "Updated Test Bank",
        accountNumber: "9876543210",
        sortCode: "56-78-90",
      };

      const res = await request(app)
        .patch(`/api/bank-details/${user._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updatedBankDetailsData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Bank details updated successfully");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.accountName).toBe(
        updatedBankDetailsData.accountName
      );
      expect(res.body.data.bankName).toBe(updatedBankDetailsData.bankName);
      expect(res.body.data.accountNumber).toBe(
        updatedBankDetailsData.accountNumber
      );
      expect(res.body.data.sortCode).toBe(updatedBankDetailsData.sortCode);

      const updatedBankDetails = await BankDetails.findOne({
        user: user._id,
      });

      expect(updatedBankDetails).toBeDefined();
      expect(updatedBankDetails.accountName).toBe(
        updatedBankDetailsData.accountName
      );
      expect(updatedBankDetails.bankName).toBe(updatedBankDetailsData.bankName);
      expect(updatedBankDetails.accountNumber).toBe(
        updatedBankDetailsData.accountNumber
      );
      expect(updatedBankDetails.sortCode).toBe(updatedBankDetailsData.sortCode);
    }, 10000);

    it("should return 404 if bank details are not found for the user", async () => {
      const res = await request(app)
        .patch(`/api/bank-details/${euser._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          accountName: "Updated Test Account",
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Bank details not found");
      user.role = "user";
      await user.save();
    }, 10000);
  }, 10000);

  describe("DELETE /bank-details/:userId", () => {
    it("should delete bank details for the specified user", async () => {
      user.role = "admin";
      await user.save();

      const res = await request(app)
        .delete(`/api/bank-details/${user._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Bank details deleted successfully");

      const deletedBankDetails = await BankDetails.findOne({
        user: user._id,
      });

      expect(deletedBankDetails).toBeNull();
    }, 10000);

    it("should return 404 if bank details are not found for the user", async () => {
      const res = await request(app)
        .delete(`/api/bank-details/${euser._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Bank details not found");
      user.role = "user";
      await user.save();
    }, 10000);
  }, 10000);

  describe("GET /verify-payment", () => {
    it("should verify the payment and update the group and payment", async () => {
      const txRef = "test-payment-reference";
      const transactionId = "test-transaction-id";
      const payment = await PaymentModel.createPayment({
        reference: txRef,
        userId: user._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });

      const res = await request(app).get(
        `/api/verify-payment?tx_ref=${txRef}&transaction_id=${transactionId}`
      );

      expect(res.text).toContain("Payment successful");
      expect(res.status).toBe(200);

      const updatedPayment = await PaymentModel.findOne({
        reference: txRef,
      });

      expect(updatedPayment.status).toBe("successful");

      const updatedGroupMember = await Group.findOne(
        { _id: group._id },
        { members: { $elemMatch: { user: user._id } } }
      );

      expect(updatedGroupMember.members[0].subscriptionStatus).toBe("active");
      expect(updatedGroupMember.members[0].paymentActive).toBe(true);
    }, 10000);

    it("should return 400 if payment not found", async () => {
      const txRef = "invalid-payment-reference";
      const transactionId = "test-transaction-id";

      const res = await request(app).get(
        `/api/verify-payment?tx_ref=${txRef}&transaction_id=${transactionId}`
      );

      expect(res.status).toBe(400);
      expect(res.text).toContain("Invalid payment info");
    }, 10000);

    it("should return 400 if payment already marked as successful", async () => {
      const txRef = "test-payment-reference";
      const transactionId = "test-transaction-id";
      const payment = await PaymentModel.createPayment({
        reference: txRef,
        userId: user._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
        status: "successful",
      });

      const res = await request(app).get(
        `/api/verify-payment?tx_ref=${txRef}&transaction_id=${transactionId}`
      );

      expect(res.status).toBe(400);
      expect(res.text).toContain("Payment details have already been used");
    }, 10000);

    it("should return 400 if group not found", async () => {
      const txRef = "test-payment-reference3";
      const transactionId = "test-transaction-id3";
      const gId = new mongoose.Types.ObjectId();
      const payment = await PaymentModel.createPayment({
        reference: txRef,
        userId: user._id,
        groupId: gId.toString(),
        amount: 10,
        currency: "NGN",
      });

      const res = await request(app).get(
        `/api/verify-payment?tx_ref=${txRef}&transaction_id=${transactionId}`
      );

      expect(res.status).toBe(400);
      expect(res.text).toContain("Group not found");
    }, 10000);

    it("should return 400 if user is not a member of the group", async () => {
      const txRef = "test-payment-reference4";
      const transactionId = "test-transaction-id4";
      const uId = new mongoose.Types.ObjectId();
      const payment = await PaymentModel.createPayment({
        reference: txRef,
        userId: euser._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });

      const res = await request(app).get(
        `/api/verify-payment?tx_ref=${txRef}&transaction_id=${transactionId}`
      );

      expect(res.status).toBe(400);
      expect(res.text).toContain("You are not a member of the group");
    }, 10000);

    it("should update payment status to failed if verification failed", async () => {
      const txRef = "test-payment-reference5";
      const transactionId = "test-transaction-5";
      const payment = await PaymentModel.createPayment({
        reference: txRef,
        userId: user._id,
        groupId: group._id,
        amount: 10,
        currency: "NGN",
      });

      jest
        .spyOn(Flutterwave, "verify")
        .mockResolvedValueOnce({ status: false });

      const res = await request(app).get(
        `/api/verify-payment?tx_ref=${txRef}&transaction_id=${transactionId}`
      );

      expect(res.status).toBe(400);
      expect(res.text).toContain("Payment failed");

      const updatedPayment = await PaymentModel.findOne({
        reference: txRef,
      });

      expect(updatedPayment.status).toBe("failed");
    }, 10000);
  });

  describe("GET /banks", () => {
    it("should return list of banks", async () => {
      const res = await request(app).get("/api/banks");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Banks retrieved successfully");
      expect(res.body.data).toEqual([]); // Empty array as mocked
    });
  }, 10000);
});

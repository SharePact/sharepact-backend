const mongoose = require("mongoose");
const request = require("supertest");
const { generateToken } = require("../utils/auth");
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
const OTPModel = require("../models/otp");

jest.mock("../processQueue", () => ({
  getProcessQueue: jest.fn(),
}));

jest.mock("../notification/brevo", () => ({
  sendEmailWithBrevo: jest.fn(),
}));

describe("Auth API Endpoints", () => {
  let user;
  let authToken;
  let service;
  let group;
  let message;
  let category;
  let otp;
  let passOtp;
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
    jest.clearAllMocks();

    // Mock the processQueue.add function
    processQueueManager.getProcessQueue.mockReturnValue({
      add: jest.fn(),
    });

    authToken = await createAuthToken(user);
    message = await createMessage(group, user);
    otp = await createOTP(user, "emailVerification");
    passOtp = await OTPModel.createNumberOTP(user._id, "passwordReset", 6);
  }, 100000);

  afterEach(async () => {
    await AuthToken.deleteMany({});
    await OTP.deleteMany({});
    await Message.deleteMany({});
  }, 100000);

  describe("POST /signup", () => {
    it("should successfully create a new user", async () => {
      console.log("///////////////////////////////sgttattstts");
      const email = "test2@example.com";
      const password = "testpassword";

      const res = await request(app)
        .post("/auth/signup")
        .send({ email, password });

      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User signed up successfully");
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.username).toBeDefined();
    });

    it("should return 400 if email already exists", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({ email: user.email, password: "testpassword" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Email already exists. Please use a different email address."
      );
    });
  }, 100000);

  describe("POST /signin", () => {
    it("should successfully sign in a user", async () => {
      const res = await request(app)
        .post("/auth/signin")
        .send({ email: user.email, password: "testpassword" });

      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User signed in successfully");
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.token).toBeDefined();
    });

    it("should return 400 if incorrect email or password", async () => {
      const res = await request(app)
        .post("/auth/signin")
        .send({ email: user.email, password: "wrongpassword" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Incorrect email or password");
    });
  }, 100000);

  describe("GET /verify-token", () => {
    it("should verify a valid token", async () => {
      const res = await request(app)
        .get("/auth/verify-token")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");
      expect(res.body.data.valid).toBe(true);
    });

    it("should return 401 if no token provided", async () => {
      const res = await request(app).get("/auth/verify-token");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 401 if invalid token", async () => {
      const invalidToken = generateToken({
        userId: "invalid",
        email: "invalid",
      });
      const res = await request(app)
        .get("/auth/verify-token")
        .set("Authorization", `Bearer ${invalidToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Error: Invalid token");
    });
  }, 100000);

  describe("POST /logout", () => {
    it("should successfully logout a user", async () => {
      const res = await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successfully logged out");
    });
  }, 100000);

  describe("POST /logout-all-sessions", () => {
    it("should successfully logout all sessions of a user", async () => {
      const res = await request(app)
        .post("/auth/logout-all-sessions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successfully logged out");
    });
  }, 100000);

  describe("GET /user", () => {
    it("should return user details", async () => {
      const res = await request(app)
        .get("/auth/user")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data.email).toBe(user.email);
    });
  }, 100000);

  describe("POST /password-reset", () => {
    it("should send a password reset OTP", async () => {
      const res = await request(app)
        .post("/auth/password-reset")
        .send({ email: user.email });

      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful sent otp");
    });

    it("should return 400 if email is not registered", async () => {
      const res = await request(app)
        .post("/auth/password-reset")
        .send({ email: "nonexistent@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("email is not registered");
    });
  }, 100000);

  describe("PATCH /change-password", () => {
    it("should successfully change the password", async () => {
      const newPassword = "newpassword";
      const res = await request(app)
        .patch("/auth/change-password")
        .send({ email: user.email, code: passOtp.code, password: newPassword });

      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("password change successful");
    });

    it("should return 400 if password is missing", async () => {
      const res = await request(app)
        .patch("/auth/change-password")
        .send({ email: user.email, code: otp.code });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("password is missing");
    });

    it("should return 400 if code is missing", async () => {
      const res = await request(app)
        .patch("/auth/change-password")
        .send({ email: user.email, password: "newpassword" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("code is missing");
    });

    it("should return 400 if user not found", async () => {
      const res = await request(app).patch("/auth/change-password").send({
        email: "nonexistent@example.com",
        code: otp.code,
        password: "newpassword",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("user not found");
    });

    it("should return 400 if invalid code", async () => {
      const res = await request(app).patch("/auth/change-password").send({
        email: user.email,
        code: "invalidcode",
        password: "newpassword",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("invalid code");
    });
  }, 100000);

  describe("POST /password-reset/verify-otp", () => {
    it("should verify a valid password reset OTP", async () => {
      const res = await request(app)
        .post("/auth/password-reset/verify-otp")
        .send({ email: user.email, code: passOtp.code });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("valid code");
    });

    it("should return 400 if code is missing", async () => {
      const res = await request(app)
        .post("/auth/password-reset/verify-otp")
        .send({ email: user.email });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("code is missing");
    });

    it("should return 400 if invalid code", async () => {
      const res = await request(app)
        .post("/auth/password-reset/verify-otp")
        .send({ email: user.email, code: "invalidcode" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("invalid code");
    });

    it("should return 400 if user not found", async () => {
      const res = await request(app)
        .post("/auth/password-reset/verify-otp")
        .send({ email: "nonexistent@example.com", code: otp.code });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("user not found");
    });
  });

  describe("POST /email-verification/resend-otp", () => {
    it("should resend an email verification OTP", async () => {
      const res = await request(app)
        .post("/auth/email-verification/resend-otp")
        .send({ email: user.email });

      expect(processQueueManager.getProcessQueue).toHaveBeenCalled();
      expect(processQueueManager.getProcessQueue().add).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successfully sent code");
    });

    it("should return 400 if user not found", async () => {
      const res = await request(app)
        .post("/auth/email-verification/resend-otp")
        .send({ email: "nonexistent@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("user not found");
    });
  });

  describe("POST /email-verification/verify-otp", () => {
    it("should verify an email verification OTP", async () => {
      const res = await request(app)
        .post("/auth/email-verification/verify-otp")
        .send({ email: user.email, code: otp.code });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("email verified");
    });

    it("should return 400 if code is missing", async () => {
      const res = await request(app)
        .post("/auth/email-verification/verify-otp")
        .send({ email: user.email });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("code is missing");
    });

    it("should return 400 if invalid code", async () => {
      const res = await request(app)
        .post("/auth/email-verification/verify-otp")
        .send({ email: user.email, code: "invalidcode" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("invalid code");
    });

    it("should return 400 if user not found", async () => {
      const res = await request(app)
        .post("/auth/email-verification/verify-otp")
        .send({ email: "nonexistent@example.com", code: otp.code });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("user not found");
    });
  });
});

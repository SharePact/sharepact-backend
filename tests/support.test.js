const mongoose = require("mongoose");
const request = require("supertest");
const SupportTicketModel = require("../models/support");
const Server = require("../middleware/index.js");
const Router = require("../routes/index.js");

describe("Support Ticket API Endpoints", () => {
  let app;

  beforeAll(async () => {
    mongoose
      .connect(process.env.MONGODB_TEST_URI)
      .then(() => console.log("MongoDB connected..."))
      .catch((err) => console.error("MongoDB connection error:", err));

    const server = new Server(new Router());
    app = server.getApp();
  }, 100000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 100000);

  beforeEach(async () => {
    await SupportTicketModel.deleteMany({});
  }, 100000);

  afterEach(async () => {
    await SupportTicketModel.deleteMany({});
  }, 100000);

  describe("POST /support", () => {
    it("should successfully create a new support ticket", async () => {
      const name = "Test User";
      const email = "test@example.com";
      const message = "This is a test message";

      const res = await request(app)
        .post("/api/support/contact-support")
        .send({ name, email, message });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toBeFalsy();
    });

    it("should return 400 if email is missing", async () => {
      const name = "Test User";
      const message = "This is a test message";

      const res = await request(app)
        .post("/api/support/contact-support")
        .send({ name, message });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("invalid request payload");
    });

    it("should return 400 if message is missing", async () => {
      const name = "Test User";
      const email = "test@example.com";

      const res = await request(app)
        .post("/api/support/contact-support")
        .send({ name, email });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("invalid request payload");
    });
  }, 100000);

  describe("GET /support", () => {
    it("should return a list of support tickets", async () => {
      const ticket1 = await SupportTicketModel.createSupportTicket({
        name: "Test User 1",
        email: "test1@example.com",
        message: "Test message 1",
      });
      const ticket2 = await SupportTicketModel.createSupportTicket({
        name: "Test User 2",
        email: "test2@example.com",
        message: "Test message 2",
      });

      const res = await request(app).get("/api/support/contact-support");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: expect.any(String),
            name: "Test User 1",
            email: "test1@example.com",
            message: "Test message 1",
            createdAt: expect.any(String), // Assuming createdAt is returned as a string
            resolved: false,
          }),
          expect.objectContaining({
            _id: expect.any(String),
            name: "Test User 2",
            email: "test2@example.com",
            message: "Test message 2",
            createdAt: expect.any(String), // Assuming createdAt is returned as a string
            resolved: false,
          }),
        ])
      );
    });

    it("should return an empty array if no tickets exist", async () => {
      const res = await request(app).get("/api/support/contact-support");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toEqual([]);
    });

    it("should filter tickets by resolved status", async () => {
      const ticket1 = await SupportTicketModel.createSupportTicket({
        name: "Test User 1",
        email: "test1@example.com",
        message: "Test message 1",
      });
      await ticket1.resolveTicket();

      const res = await request(app).get(
        "/api/support/contact-support?resolved=true"
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: expect.any(String),
            name: "Test User 1",
            email: "test1@example.com",
            message: "Test message 1",
            createdAt: expect.any(String), // Assuming createdAt is returned as a string
            resolved: true,
          }),
        ])
      );
    });
  }, 100000);

  describe("GET /support/:id", () => {
    it("should return the support ticket with the given id", async () => {
      const ticket = await SupportTicketModel.createSupportTicket({
        name: "Test User",
        email: "test@example.com",
        message: "Test message",
      });

      const res = await request(app).get(
        `/api/support/contact-support/${ticket._id.toString()}`
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toEqual(
        expect.objectContaining({
          _id: expect.any(String),
          name: "Test User",
          email: "test@example.com",
          message: "Test message",
          createdAt: expect.any(String), // Assuming createdAt is returned as a string
          resolved: false,
        })
      );
    });

    it("should return 400 if support ticket not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app).get(
        `/api/support/contact-support/${invalidId.toString()}`
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("not found");
    });
  }, 100000);

  describe("PATCH /support/:id", () => {
    it("should resolve the support ticket with the given id", async () => {
      const ticket = await SupportTicketModel.createSupportTicket({
        name: "Test User",
        email: "test@example.com",
        message: "Test message",
      });

      const res = await request(app).patch(
        `/api/support/contact-support/resolve/${ticket._id.toString()}`
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toEqual(
        expect.objectContaining({
          _id: expect.any(String),
          name: "Test User",
          email: "test@example.com",
          message: "Test message",
          createdAt: expect.any(String), // Assuming createdAt is returned as a string
          resolved: true,
          resolvedAt: expect.any(String), // Assuming resolvedAt is returned as a string
        })
      );
    });

    it("should return 400 if support ticket not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app).patch(
        `/api/support/contact-support/resolve/${invalidId.toString()}`
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("not found");
    });
  }, 100000);
});

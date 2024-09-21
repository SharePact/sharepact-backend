const mongoose = require("mongoose");
const request = require("supertest");
const Requestdelete = require("../models/requestDelete");
const User = require("../models/user");
const AuthToken = require("../models/authToken");
const {
  createAuthToken,
  createUser,
  createAdminUserWithEmailAndPassword,
} = require("./test-utils.js");
const Server = require("../middleware/index.js");
const Router = require("../routes/index.js");

describe("Request Delete API Endpoints", () => {
  let user;
  let authToken;
  let requestDeleteEntry;
  let app;

  beforeAll(async () => {
    mongoose
      .connect(process.env.MONGODB_TEST_URI)
      .then(() => console.log("MongoDB connected..."))
      .catch((err) => console.error("MongoDB connection error:", err));

    const server = new Server(new Router());
    app = server.getApp();

    user = await createAdminUserWithEmailAndPassword(
      "requedel@example.com",
      "requedel"
    );
  }, 100000);

  afterAll(async () => {
    await User.deleteMany({});
    await Requestdelete.deleteMany({});
    await mongoose.disconnect();
  }, 100000);

  beforeEach(async () => {
    await Requestdelete.deleteMany({});
    authToken = await createAuthToken(user);
    requestDeleteEntry = await Requestdelete.createRequestDelete({
      name: "Test User",
      email: "test@example.com",
    });
  }, 100000);

  afterEach(async () => {
    await Requestdelete.deleteMany({});
    await AuthToken.deleteMany({});
  }, 100000);

  describe("POST /request-delete", () => {
    it("should successfully create a new request delete entry", async () => {
      const name = "Test User 2";
      const email = "test2@example.com";

      const res = await request(app)
        .post("/api/request-delete")
        .send({ name, email });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Successfully requested to be deleted");
      expect(res.body.data.name).toBe(name);
      expect(res.body.data.email).toBe(email);
    });

    it("should return 400 if name or email is missing", async () => {
      const res = await request(app)
        .post("/api/request-delete")
        .send({ name: "Test User" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Name and email are required");
    });

    it("should return 400 if email already exists in the request delete list", async () => {
      const res = await request(app).post("/api/request-delete").send({
        name: "Test User",
        email: requestDeleteEntry.email,
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "You have already requested for your account to be deleted"
      );
    });
  });

  describe("GET /request-delete", () => {
    it("should return a list of request delete entries", async () => {
      const res = await request(app)
        .get("/api/request-delete")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Successful");
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: requestDeleteEntry.name,
            email: requestDeleteEntry.email,
          }),
        ])
      );
    });

    it("should return 401 if not authorized", async () => {
      const res = await request(app).get("/api/request-delete");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      user.role = "user"; // Make the user a non-admin
      await user.save();
      const res = await request(app)
        .get("/api/request-delete")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
    });
  });

  describe("GET /request-delete/:id", () => {
    it("should return the request delete entry with the given id", async () => {
      const res = await request(app)
        .get(`/api/request-delete/${requestDeleteEntry._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Successful");
      expect(res.body.data.name).toBe(requestDeleteEntry.name);
      expect(res.body.data.email).toBe(requestDeleteEntry.email);
    });

    it("should return 404 if request delete entry not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/request-delete/${invalidId.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Request delete entry not found");
    });
  });
});

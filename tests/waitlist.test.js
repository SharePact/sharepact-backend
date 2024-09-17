const mongoose = require("mongoose");
const request = require("supertest");
// const app = require("../app"); // Assuming your app is in a file named 'app.js'

const Waitlist = require("../models/waitlist");
const User = require("../models/user");
const AuthToken = require("../models/authToken");
const {
  createAuthToken,
  createUser,
  createWaitlist,
} = require("./test-utils.js"); // Import helper functions
const Server = require("../middleware/index.js");
const Router = require("../routes/index.js");

describe("Waitlist API Endpoints", () => {
  let user;
  let authToken;
  let waitlistEntry;
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
    await Waitlist.deleteMany({});
    user = await createUser();
    authToken = await createAuthToken(user);
    waitlistEntry = await createWaitlist();
  }, 100000);

  afterEach(async () => {
    await Waitlist.deleteMany({});
    await AuthToken.deleteMany({});
    await User.deleteMany({});
  }, 100000);

  describe("POST /waitlist", () => {
    it("should successfully create a new waitlist entry", async () => {
      const name = "Test User";
      const email = "test@example.com";

      const res = await request(app)
        .post("/api/waitlist")
        .send({ name, email });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Successfully joined the waitlist");
      expect(res.body.data.name).toBe(name);
      expect(res.body.data.email).toBe(email);
    });

    it("should return 400 if name or email is missing", async () => {
      const res = await request(app)
        .post("/api/waitlist")
        .send({ name: "Test User" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Name and email are required");
    });

    it("should return 400 if email already exists in the waitlist", async () => {
      const res = await request(app).post("/api/waitlist").send({
        name: "Test User",
        email: waitlistEntry.email,
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("This email is already on the waitlist");
    });
  }, 100000);

  describe("GET /waitlist", () => {
    it("should return a list of waitlist entries", async () => {
      const res = await request(app)
        .get("/api/waitlist")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Successful");
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: waitlistEntry.name,
            email: waitlistEntry.email,
          }),
        ])
      );
    });

    it("should return 401 if not authorized", async () => {
      const res = await request(app).get("/api/waitlist");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      user.role = "user"; // Make the user a non-admin
      await user.save();
      const res = await request(app)
        .get("/api/waitlist")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
    });
  }, 100000);

  describe("GET /waitlist/:id", () => {
    it("should return the waitlist entry with the given id", async () => {
      console.log({ entryID: waitlistEntry._id });
      const res = await request(app)
        .get(`/api/waitlist/${waitlistEntry._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Successful");
      expect(res.body.data.name).toBe(waitlistEntry.name);
      expect(res.body.data.email).toBe(waitlistEntry.email);
    });

    it("should return 404 if waitlist entry not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/waitlist/${invalidId.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Waitlist entry not found");
    });
  }, 100000);

  describe("PUT /waitlist/:id", () => {
    it("should update the waitlist entry with the given id", async () => {
      const newName = "Updated Test User";
      const newEmail = "updated@example.com";

      const res = await request(app)
        .put(`/api/waitlist/${waitlistEntry._id.toString()}`)
        .send({ name: newName, email: newEmail })
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Successful");
      expect(res.body.data.name).toBe(newName);
      expect(res.body.data.email).toBe(newEmail);
    });

    it("should return 404 if waitlist entry not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/waitlist/${invalidId.toString()}`)
        .send({ name: "Updated Test User", email: "updated@example.com" })
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Waitlist entry not found");
    });

    it("should return 401 if not authorized", async () => {
      const res = await request(app)
        .put(`/api/waitlist/${waitlistEntry._id.toString()}`)
        .send({ name: "Updated Test User", email: "updated@example.com" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      user.role = "user"; // Make the user a non-admin
      await user.save();
      const res = await request(app)
        .put(`/api/waitlist/${waitlistEntry._id.toString()}`)
        .send({ name: "Updated Test User", email: "updated@example.com" })
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
    });
  }, 100000);

  describe("DELETE /waitlist/:id", () => {
    it("should delete the waitlist entry with the given id", async () => {
      const res = await request(app)
        .delete(`/api/waitlist/${waitlistEntry._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Waitlist entry deleted successfully");
    });

    it("should return 404 if waitlist entry not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/waitlist/${invalidId.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Waitlist entry not found");
    });

    it("should return 401 if not authorized", async () => {
      const res = await request(app).delete(
        `/api/waitlist/${waitlistEntry._id.toString()}`
      );

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      user.role = "user"; // Make the user a non-admin
      await user.save();
      const res = await request(app)
        .delete(`/api/waitlist/${waitlistEntry._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
    });
  }, 100000);
});

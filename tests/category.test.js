const mongoose = require("mongoose");
const request = require("supertest");
const {
  createCategory,
  createAdminUserWithEmailAndPassword,
  createAuthToken,
} = require("./test-utils");
const Server = require("../middleware/index.js");
const Router = require("../routes/index.js");
const { uploadBufferToCloudinary } = require("../utils/cloudinary");
const AuthToken = require("../models/authToken");
const User = require("../models/user");
const Category = require("../models/category");

jest.mock("../utils/cloudinary", () => ({
  uploadBufferToCloudinary: jest.fn(),
}));

describe("Category API Endpoints", () => {
  let user;
  let authToken;
  let app;
  let category;
  const buffer = Buffer.from("Test Image", "utf-8");

  beforeAll(async () => {
    mongoose
      .connect(process.env.MONGODB_TEST_URI)
      .then(() => console.log("MongoDB connected..."))
      .catch((err) => console.error("MongoDB connection error:", err));

    const server = new Server(new Router());
    app = server.getApp();
    await User.deleteMany({});
    user = await createAdminUserWithEmailAndPassword("test3@gmail.com");
    authToken = await createAuthToken(user);
  }, 100000);

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await AuthToken.deleteMany({});
    await mongoose.disconnect();
  }, 100000);

  beforeEach(async () => {
    category = await createCategory();
  }, 100000);

  afterEach(async () => {
    await Category.deleteMany({});
  });

  describe("POST /categories", () => {
    it("should successfully create a new category", async () => {
      const categoryName = "Test Category";

      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .field("categoryName", categoryName)
        .attach("image", buffer, "test.jpg");

      expect(uploadBufferToCloudinary).toHaveBeenCalled();
      expect(res.status).toBe(201);
      expect(res.body.message).toBe("category created successfully");
      expect(res.body.data.categoryName).toBe(categoryName);
    });

    it("should return 400 if categoryName is missing", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", buffer, "test.jpg");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("categoryName is required");
    });

    it("should return 401 if not authorized", async () => {
      const res = await request(app)
        .post("/api/categories")
        .field("categoryName", "Test Category")
        .attach("image", buffer, "test.jpg");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      user.role = "user";
      await user.save();
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .field("categoryName", "Test Category")
        .attach("image", buffer, "test.jpg");

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
    });
  }, 100000);

  describe("GET /categories", () => {
    it("should successfully retrieve all categories", async () => {
      const res = await request(app)
        .get("/api/categories")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            categoryName: category.categoryName,
            imageUrl: category.imageUrl,
          }),
        ])
      );
    });
  }, 100000);

  describe("GET /categories/:id", () => {
    it("should successfully retrieve category by id", async () => {
      const res = await request(app)
        .get(`/api/categories/${category._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data.category.categoryName).toBe(category.categoryName);
      expect(res.body.data.category.imageUrl).toBe(category.imageUrl);
    });

    it("should return 404 if category not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/categories/${invalidId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
    });
  }, 100000);

  describe("PUT /categories/:id", () => {
    it("should successfully update a category", async () => {
      const updatedCategoryName = "Updated Test Category";
      user.role = "admin";
      await user.save();
      const res = await request(app)
        .put(`/api/categories/${category._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("categoryName", updatedCategoryName)
        .attach("image", buffer, "test.jpg");

      expect(uploadBufferToCloudinary).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("successful");
      expect(res.body.data.categoryName).toBe(updatedCategoryName);
    });

    it("should return 404 if category not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/categories/${invalidId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("categoryName", "Updated Test Category")
        .attach("image", buffer, "test.jpg");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
    });

    it("should return 401 if not authorized", async () => {
      const res = await request(app)
        .put(`/api/categories/${category._id.toString()}`)
        .field("categoryName", "Updated Test Category")
        .attach("image", buffer, "test.jpg");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      user.role = "user";
      await user.save();
      const res = await request(app)
        .put(`/api/categories/${category._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("categoryName", "Updated Test Category")
        .attach("image", buffer, "test.jpg");

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
    });
  }, 200000);

  describe("DELETE /categories/:id", () => {
    it("should successfully delete a category", async () => {
      user.role = "admin";
      await user.save();
      const res = await request(app)
        .delete(`/api/categories/${category._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Category deleted successfully");
    });

    it("should return 404 if category not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/categories/${invalidId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
    });

    it("should return 401 if not authorized", async () => {
      const res = await request(app).delete(
        `/api/categories/${category._id.toString()}`
      );

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      user.role = "user";
      await user.save();
      const res = await request(app)
        .delete(`/api/categories/${category._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
    });
  }, 100000);
});

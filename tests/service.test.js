const mongoose = require("mongoose");
const request = require("supertest");
const {
  createCategory,
  createAdminUserWithEmailAndPassword,
  createAuthToken,
  createService,
} = require("./test-utils");
const Server = require("../middleware/index.js");
const Router = require("../routes/index.js");
const AuthToken = require("../models/authToken");
const User = require("../models/user");
const Category = require("../models/category");
const Service = require("../models/service");

// jest.mock("../utils/uploadfiletostorage", () => ({
//   uploadFileToStorage: jest.fn(),
// }));

const cloudinary = require("../config/cloudinary");
jest.mock("../config/cloudinary", () => ({
  uploader: {
    upload: jest.fn(),
  },
}));

describe("Service API Endpoints", () => {
  let user;
  let authToken;
  let app;
  let category;
  let service;
  const buffer = Buffer.from("Test Image", "utf-8");
  const mockResult = { secure_url: "https://mock-url.com/test-logo.png" };
  cloudinary.uploader.upload.mockResolvedValue(mockResult);

  beforeAll(async () => {
    mongoose
      .connect(process.env.MONGODB_TEST_URI)
      .then(() => console.log("MongoDB connected..."))
      .catch((err) => console.error("MongoDB connection error:", err));

    const server = new Server(new Router());
    app = server.getApp();
    await User.deleteMany({});
    await Category.deleteMany({});
    await Service.deleteMany({});
    await AuthToken.deleteMany({});
    user = await createAdminUserWithEmailAndPassword("test4@gmail.com");
    authToken = await createAuthToken(user);
  }, 100000);

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Service.deleteMany({});
    await AuthToken.deleteMany({});
    await mongoose.disconnect();
  }, 100000);

  beforeEach(async () => {
    category = await createCategory();
  }, 100000);

  afterEach(async () => {
    await Category.deleteMany({});
    await Service.deleteMany({});
  }, 100000);

  describe("POST /services", () => {
    it("should successfully create a new service", async () => {
      const serviceName = "Test Service";
      const serviceDescription = "Test service description";
      const currency = "USD";
      const handlingFees = 10.0;

      const res = await request(app)
        .post("/api/services")
        .set("Authorization", `Bearer ${authToken}`)
        .field("serviceName", serviceName)
        .field("serviceDescription", serviceDescription)
        .field("currency", currency)
        .field("handlingFees", handlingFees)
        .field("categoryId", category._id.toString())
        .attach("logo", buffer, "test.jpg");

      //   expect(uploadFileToStorage).toHaveBeenCalled();
      expect(res.body.message).toBe("Service created successfully");
      expect(res.status).toBe(201);
      expect(res.body.data.serviceName).toBe(serviceName);
      expect(res.body.data.serviceDescription).toBe(serviceDescription);
      expect(res.body.data.currency).toBe(currency);
      expect(res.body.data.handlingFees).toBe(handlingFees);
      expect(res.body.data.categoryName).toBe(category.categoryName);
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .post("/api/services")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("logo", buffer, "test.jpg");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    it("should return 404 if category not found", async () => {
      const invalidCategoryId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post("/api/services")
        .set("Authorization", `Bearer ${authToken}`)
        .field("serviceName", "Test Service")
        .field("serviceDescription", "Test service description")
        .field("currency", "USD")
        .field("handlingFees", 10.0)
        .field("categoryId", invalidCategoryId.toString())
        .attach("logo", buffer, "test.jpg");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
    });

    it("should return 401 if not authorized", async () => {
      const res = await request(app)
        .post("/api/services")
        .field("serviceName", "Test Service")
        .field("serviceDescription", "Test service description")
        .field("currency", "USD")
        .field("handlingFees", 10.0)
        .field("categoryId", category._id.toString())
        .attach("logo", buffer, "test.jpg");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      user.role = "user";
      await user.save();
      const res = await request(app)
        .post("/api/services")
        .set("Authorization", `Bearer ${authToken}`)
        .field("serviceName", "Test Service")
        .field("serviceDescription", "Test service description")
        .field("currency", "USD")
        .field("handlingFees", 10.0)
        .field("categoryId", category._id.toString())
        .attach("logo", buffer, "test.jpg");

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
      user.role = "admin";
      await user.save();
    });
  }, 100000);

  describe("GET /services", () => {
    it("should successfully retrieve all services", async () => {
      service = await createService(category._id);
      const res = await request(app)
        .get("/api/services")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Services fetched successfully");
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            serviceName: service.serviceName,
            serviceDescription: service.serviceDescription,
            currency: service.currency,
            handlingFees: service.handlingFees,
            categoryId: service.categoryId.toString(),
          }),
        ])
      );
    });

    it("should successfully retrieve services by category", async () => {
      service = await createService(category._id);
      const res = await request(app)
        .get(`/api/services?category=${category._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Services fetched successfully");
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            serviceName: service.serviceName,
            serviceDescription: service.serviceDescription,
            currency: service.currency,
            handlingFees: service.handlingFees,
            categoryId: service.categoryId.toString(),
          }),
        ])
      );
    });
  }, 100000);

  describe("GET /services/:id", () => {
    it("should successfully retrieve a service by id", async () => {
      service = await createService(category._id);
      const res = await request(app)
        .get(`/api/services/${service._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Service fetched successfully");
      expect(res.body.data.serviceName).toBe(service.serviceName);
      expect(res.body.data.serviceDescription).toBe(service.serviceDescription);
      expect(res.body.data.currency).toBe(service.currency);
      expect(res.body.data.handlingFees).toBe(service.handlingFees);
      expect(res.body.data.categoryName).toBe(category.categoryName);
    });

    it("should return 404 if service not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/services/${invalidId.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Service not found");
    });
  }, 100000);

  describe("PUT /services/:id", () => {
    it("should successfully update a service", async () => {
      service = await createService(category._id);
      const updatedServiceName = "Updated Test Service";
      const updatedServiceDescription = "Updated service description";
      const updatedCurrency = "EUR";
      const updatedHandlingFees = 15.0;

      const res = await request(app)
        .put(`/api/services/${service._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("serviceName", updatedServiceName)
        .field("serviceDescription", updatedServiceDescription)
        .field("currency", updatedCurrency)
        .field("handlingFees", updatedHandlingFees)
        .field("categoryId", category._id.toString())
        .attach("logo", buffer, "test.jpg");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Service updated successfully");
      expect(res.body.data.serviceName).toBe(updatedServiceName);
      expect(res.body.data.serviceDescription).toBe(updatedServiceDescription);
      expect(res.body.data.currency).toBe(updatedCurrency);
      expect(res.body.data.handlingFees).toBe(updatedHandlingFees);
      expect(res.body.data.categoryName).toBe(category.categoryName);
    });

    it("should return 404 if service not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/services/${invalidId.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("serviceName", "Updated Test Service")
        .field("serviceDescription", "Updated service description")
        .field("currency", "EUR")
        .field("handlingFees", 15.0)
        .field("categoryId", category._id.toString())
        .attach("logo", buffer, "test.jpg");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Service not found");
    });

    it("should return 401 if not authorized", async () => {
      service = await createService(category._id);
      const res = await request(app)
        .put(`/api/services/${service._id.toString()}`)
        .field("serviceName", "Updated Test Service")
        .field("serviceDescription", "Updated service description")
        .field("currency", "EUR")
        .field("handlingFees", 15.0)
        .field("categoryId", category._id.toString())
        .attach("logo", buffer, "test.jpg");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      service = await createService(category._id);
      user.role = "user";
      await user.save();
      const res = await request(app)
        .put(`/api/services/${service._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("serviceName", "Updated Test Service")
        .field("serviceDescription", "Updated service description")
        .field("currency", "EUR")
        .field("handlingFees", 15.0)
        .field("categoryId", category._id.toString())
        .attach("logo", buffer, "test.jpg");

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
      user.role = "admin";
      await user.save();
    });
  }, 100000);

  describe("DELETE /services/:id", () => {
    it("should successfully delete a service", async () => {
      service = await createService(category._id);
      const res = await request(app)
        .delete(`/api/services/${service._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Service deleted successfully");
    });

    it("should return 404 if service not found", async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/services/${invalidId.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Service not found");
    });

    it("should return 401 if not authorized", async () => {
      service = await createService(category._id);
      const res = await request(app).delete(
        `/api/services/${service._id.toString()}`
      );

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: No token provided");
    });

    it("should return 403 if user is not an admin", async () => {
      service = await createService(category._id);
      user.role = "user";
      await user.save();
      const res = await request(app)
        .delete(`/api/services/${service._id.toString()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Unauthorized access");
      user.role = "admin";
      await user.save();
    });
  }, 100000);
});

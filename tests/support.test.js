const request = require("supertest");
const express = require("express");
const supportController = require("../controllers/support");
const SupportTicketModel = require("../models/support");
const { BuildHttpResponse } = require("../utils/response");

jest.mock("../models/support");
jest.mock("../utils/response");

const app = express();
app.use(express.json());

app.post("/support/contact", supportController.contactSupport);
app.get("/support/requests", supportController.getContactSupportRequests);
app.get("/support/request/:id", supportController.getContactSupportRequest);
app.patch(
  "/support/request/:id/resolve",
  supportController.resolveContactSupportRequest
);

describe("Support Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks before each test
  });

  describe("contactSupport", () => {
    it("should create a support ticket and return a success message", async () => {
      SupportTicketModel.createSupportTicket.mockResolvedValueOnce({});
      BuildHttpResponse.mockImplementation((res, statusCode, message) =>
        res.status(statusCode).json({ message })
      );

      const response = await request(app).post("/support/contact").send({
        name: "John Doe",
        email: "john@example.com",
        message: "Help needed",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe("successful");
      expect(SupportTicketModel.createSupportTicket).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        message: "Help needed",
      });
    });

    it("should return an error if ticket creation fails", async () => {
      SupportTicketModel.createSupportTicket.mockRejectedValueOnce(
        new Error("Database error")
      );
      BuildHttpResponse.mockImplementation((res, statusCode, message) =>
        res.status(statusCode).json({ message })
      );

      const response = await request(app).post("/support/contact").send({
        name: "John Doe",
        email: "john@example.com",
        message: "Help needed",
      });

      expect(response.statusCode).toBe(500);
      expect(response.body.message).toBe("Database error");
    });
  });

  // describe("getContactSupportRequests", () => {
  //   it("should return a list of support tickets", async () => {
  //     const mockTickets = {
  //       results: [{ id: 1, message: "Test ticket" }],
  //       pagination: { page: 1, limit: 10 },
  //     };
  //     SupportTicketModel.getAllSupportTickets.mockResolvedValueOnce(
  //       mockTickets
  //     );
  //     BuildHttpResponse.mockImplementation(
  //       (res, statusCode, message, results, pagination) =>
  //         res.status(statusCode).json({ message, results, pagination })
  //     );

  //     const response = await request(app)
  //       .get("/support/requests")
  //       .query({ resolved: true });

  //     expect(response.statusCode).toBe(200);
  //     expect(response.body.results).toEqual(mockTickets.results);
  //     expect(SupportTicketModel.getAllSupportTickets).toHaveBeenCalledWith(
  //       1,
  //       10,
  //       true
  //     );
  //   });

  //   it("should return an error if fetching tickets fails", async () => {
  //     SupportTicketModel.getAllSupportTickets.mockRejectedValueOnce(
  //       new Error("Database error")
  //     );
  //     BuildHttpResponse.mockImplementation((res, statusCode, message) =>
  //       res.status(statusCode).json({ message })
  //     );

  //     const response = await request(app).get("/support/requests");

  //     expect(response.statusCode).toBe(500);
  //     expect(response.body.message).toBe("Database error");
  //   });
  // });

  describe("getContactSupportRequest", () => {
    it("should return the support ticket if found", async () => {
      const mockTicket = { id: 1, message: "Test ticket" };
      SupportTicketModel.findById.mockResolvedValueOnce(mockTicket);
      BuildHttpResponse.mockImplementation((res, statusCode, message, data) =>
        res.status(statusCode).json({ message, data })
      );

      const response = await request(app).get("/support/request/1");

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toEqual(mockTicket);
      expect(SupportTicketModel.findById).toHaveBeenCalledWith("1");
    });

    it("should return a 400 error if the ticket is not found", async () => {
      SupportTicketModel.findById.mockResolvedValueOnce(null);
      BuildHttpResponse.mockImplementation((res, statusCode, message) =>
        res.status(statusCode).json({ message })
      );

      const response = await request(app).get("/support/request/1");

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("not found");
    });
  });

  describe("resolveContactSupportRequest", () => {
    it("should resolve the support ticket if found", async () => {
      const mockTicket = {
        id: 1,
        message: "Test ticket",
        resolveTicket: jest.fn(),
      };
      SupportTicketModel.findById.mockResolvedValueOnce(mockTicket);
      BuildHttpResponse.mockImplementation((res, statusCode, message, data) =>
        res.status(statusCode).json({ message, data })
      );

      const response = await request(app).patch("/support/request/1/resolve");

      expect(response.statusCode).toBe(200);
      expect(mockTicket.resolveTicket).toHaveBeenCalled();
      expect(response.body.message).toBe("successful");
    });

    it("should return a 400 error if the ticket is not found", async () => {
      SupportTicketModel.findById.mockResolvedValueOnce(null);
      BuildHttpResponse.mockImplementation((res, statusCode, message) =>
        res.status(statusCode).json({ message })
      );

      const response = await request(app).patch("/support/request/1/resolve");

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("not found");
    });
  });
});

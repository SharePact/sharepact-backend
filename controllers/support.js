const SupportTicketModel = require("../models/support");
const { BuildHttpResponse } = require("../utils/response");
const mongoose = require("mongoose");
exports.contactSupport = async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await SupportTicketModel.createSupportTicket({ name, email, message });

    return BuildHttpResponse(res, 200, "successful");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getContactSupportRequests = async (req, res) => {
  try {
    const { page, limit } = req.pagination;
    const { resolved } = req.query;
    const tickets = await SupportTicketModel.getAllSupportTickets(
      page,
      limit,
      resolved ?? null
    );

    return BuildHttpResponse(
      res,
      200,
      "successful",
      tickets.results,
      tickets.pagination
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getContactSupportRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicketModel.findById(id);

    if (!ticket) return BuildHttpResponse(res, 400, "not found");

    return BuildHttpResponse(res, 200, "successful", ticket);
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.resolveContactSupportRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicketModel.findById(id);
    if (!ticket) return BuildHttpResponse(res, 400, "not found");

    await ticket.resolveTicket();
    return BuildHttpResponse(res, 200, "successful", ticket);
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

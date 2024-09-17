const Waitlist = require("../models/waitlist");
const { BuildHttpResponse } = require("../utils/response");

exports.joinWaitlist = async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return BuildHttpResponse(res, 400, "Name and email are required");
  }

  try {
    // Check if the email already exists in the waitlist
    const existingEntry = await Waitlist.findOne({ email });
    if (existingEntry) {
      return BuildHttpResponse(res, 400, "This email is already on the waitlist");
    }

    // If no duplicate is found, create a new waitlist entry
    const waitlistEntry = await Waitlist.createWaitlist({ name, email });
    return BuildHttpResponse(
      res,
      201,
      "Successfully joined the waitlist",
      waitlistEntry
    );
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};


exports.getAllWaitlistEntries = async (req, res) => {
  const { page, limit } = req.pagination;
  
  try {
    const waitlistEntries = await Waitlist.getWaitlists(page, limit);
    return BuildHttpResponse(
      res,
      200,
      "Successful",
      waitlistEntries.results,
      waitlistEntries.pagination
    );
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.getWaitlistEntryById = async (req, res) => {
  const { id } = req.params;



  try {
    const waitlistEntry = await Waitlist.findOne({ _id: id });

    if (!waitlistEntry) {
      return BuildHttpResponse(res, 404, "Waitlist entry not found");
    }
    return BuildHttpResponse(res, 200, "Successful", waitlistEntry);
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};


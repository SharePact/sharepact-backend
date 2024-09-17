const Requestdelete = require("../models/requestDelete");
const { BuildHttpResponse } = require("../utils/response");

exports.joinRequestdelete = async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return BuildHttpResponse(res, 400, "Name and email are required");
  }
  try {
    // Check if the email already exists 
    const existingEntry = await Requestdelete.findOne({ email });
    if (existingEntry) {
      return BuildHttpResponse(res, 400, "You have already requested for your account to be deleted");
    }
 
    const requestdeleteEntry = await Requestdelete.createRequestDelete({ name, email });
    return BuildHttpResponse(
      res,
      201,
      "Successfully requested to be deleted",
      requestdeleteEntry
    );
} catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.getrequestdeleteEntries = async (req, res) => {
  const { page, limit } = req.pagination;
  
  try {
    const requestdeleteEntries = await Requestdelete.getRequestDelete(page, limit);
    return BuildHttpResponse(
      res,
      200,
      "Successful",
      requestdeleteEntries.results,
      requestdeleteEntries.pagination
    );
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.getrequestdeleteEntryById = async (req, res) => {
    const { id } = req.params;
  
  
    try {
      const requestdeleteEntry = await Requestdelete.findOne({ _id: id });
  
      if (!requestdeleteEntry) {
        return BuildHttpResponse(res, 404, "Request delete entry not found");
      }
      return BuildHttpResponse(res, 200, "Successful", requestdeleteEntry);
    } catch (err) {
      return BuildHttpResponse(res, 500, err.message);
    }
  };
  


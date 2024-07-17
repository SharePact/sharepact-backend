const getPaginationParams = (req, res, next) => {
  let { page, limit } = req.query;

  // Convert page and limit to integers and set default values if not provided
  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 10;

  // Ensure page and limit are positive integers
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  // Attach page and limit to the request object for later use
  req.pagination = { page, limit };

  next();
};

module.exports = getPaginationParams;

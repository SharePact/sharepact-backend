const checkAdmin = (req, res, next) => {
  // Assuming you have a way to determine if the user is authenticated and their role
  if (req.user && req.user.role === "admin") {
    next(); // User is admin, proceed to the next middleware or route handler
  } else {
    return res.status(403).json({ error: "Unauthorized access" });
  }
};

module.exports = checkAdmin;

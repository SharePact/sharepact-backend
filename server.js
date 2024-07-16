const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const Server = require("./middleware/index.js");
const Router = require("./routes/index.js");

require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.error("MongoDB connection error:", err));

const server = new Server(new Router());
server.startListening();

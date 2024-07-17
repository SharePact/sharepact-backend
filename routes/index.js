const express = require("express");
const authRoutes = require("./auth");
const categoryRoutes = require("./category");
const serviceRoutes = require("./service");
const profileRoutes = require("./profile");
const bankDetailsRoutes = require("./bankdetails");
const groupRoutes = require("./group");
const chatRoutes = require("./chat");

class Router {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.use("/auth", authRoutes);
    this.router.use("/api/categories", categoryRoutes);
    this.router.use("/api/services", serviceRoutes);
    this.router.use("/api/profile", profileRoutes);
    this.router.use("/api", bankDetailsRoutes);
    this.router.use("/api/groups", groupRoutes);
    this.router.use("/api/chat", chatRoutes);

    this.router.use("/", async (req, res) => {
      res.status(200).json({ message: "Welcome to SharePact Api" });
    });
    // TODO: add api version
  }

  getRouter() {
    return this.router;
  }
}

module.exports = Router;

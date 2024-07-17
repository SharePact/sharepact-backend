const express = require("express");
const authRoutes = require("./auth");
const categoryRoutes = require("./category");
const serviceRoutes = require("./service");
const profileRoutes = require("./profile");
const bankDetailsRoutes = require("./bankdetails");
const groupRoutes = require("./group");
const chatRoutes = require("./chat");
const { base } = require("../models/user");
const getPaginationParams = require("../middleware/paginationParams");

class Router {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    const baseRouter = express.Router();
    baseRouter.use("/auth", authRoutes);
    baseRouter.use("/api/categories", categoryRoutes);
    baseRouter.use("/api/services", serviceRoutes);
    baseRouter.use("/api/profile", profileRoutes);
    baseRouter.use("/api", bankDetailsRoutes);
    baseRouter.use("/api/groups", groupRoutes);
    baseRouter.use("/api/chat", chatRoutes);

    baseRouter.use("/", async (req, res) => {
      res.status(200).json({ message: "Welcome to SharePact Api" });
    });

    this.router.use("/", getPaginationParams, baseRouter);
    // TODO: add api version
  }

  getRouter() {
    return this.router;
  }
}

module.exports = Router;

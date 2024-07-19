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
const { BuildHttpResponse } = require("../utils/response");
const { comprehensiveLogger, requestLogger } = require("../middleware/logger");

class Router {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    const baseRouter = express.Router();
    baseRouter.get("/", async (req, res) => {
      res.status(200).json({ message: "Welcome to SharePact Api" });
    });
    baseRouter.use("/auth", authRoutes);
    baseRouter.use("/api/categories", categoryRoutes);
    baseRouter.use("/api/services", serviceRoutes);
    baseRouter.use("/api/profile", profileRoutes);
    baseRouter.use("/api", bankDetailsRoutes);
    baseRouter.use("/api/groups", groupRoutes);
    baseRouter.use("/api/chat", chatRoutes);

    this.router.use("/", requestLogger, getPaginationParams, baseRouter);
    this.router.use((req, res, next) => {
      return BuildHttpResponse(
        res,
        404,
        "Ohh you are lost, read the API documentation to find your way back home :)"
      );
    });
    // TODO: add api version
  }

  getRouter() {
    return this.router;
  }
}

module.exports = Router;

const express = require("express");
const cors = require("cors");
const path = require("path");
const Messaging = require("../routes/socket.io");

class Server {
  constructor(baseRouter) {
    this.app = express();
    // const messagingServer = new Messaging(this.app);
    this.baseRouter = baseRouter;
    this.initializeMiddleWares();
  }

  initializeMiddleWares() {
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(this.baseRouter.getRouter());
    this.app.use(express.static(path.join(__dirname, "../public")));

    // default 500 error response
    this.app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: "Something went wrong!" });
    });
  }

  startListening() {
    const PORT = process.env.PORT || 5001;
    const server = this.app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    const messagingServer = new Messaging(server);
  }

  getApp() {
    return this.app;
  }
}

module.exports = Server;

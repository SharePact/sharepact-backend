const express = require("express");
const cors = require("cors");

class Server {
  constructor(baseRouter) {
    this.app = express();
    this.baseRouter = baseRouter;
    this.initializeMiddleWares();
  }

  initializeMiddleWares() {
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(this.baseRouter.getRouter());

    // default 500 error response
    this.app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: "Something went wrong!" });
    });
  }

  startListening() {
    const PORT = process.env.PORT || 5001;
    this.app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }

  getApp() {
    return this.app;
  }
}

module.exports = Server;

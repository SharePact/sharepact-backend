const express = require("express");
const multer = require("../config/multer");
const serviceController = require("../controllers/service");
const { createServiceSchema } = require("../zodSchemas/index");
const { checkAuth } = require("../middleware/checkauth");
const checkAdmin = require("../middleware/checkadmin");
const { ZodMiddleware } = require("../middleware/zod.middleware");

const router = express.Router();

router.post(
  "/",
  checkAuth,
  checkAdmin,
  multer.single("logo"),
  serviceController.createService
);
router.get("/", serviceController.getServices);
router.get("/:id", serviceController.getServiceById);
router.put(
  "/:id",
  checkAuth,
  checkAdmin,
  multer.single("logo"),
  serviceController.updateService
);
router.delete("/:id", checkAuth, checkAdmin, serviceController.deleteService);

module.exports = router;

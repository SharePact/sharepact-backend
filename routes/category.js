const express = require("express");
const multer = require("../config/multer");
const categoryController = require("../controllers/category");
const { checkAuth } = require("../middleware/checkAuth");
const checkAdmin = require("../middleware/checkAdmin");

const router = express.Router();

router.post(
  "/",
  checkAuth,
  checkAdmin,
  multer.single("image"),
  categoryController.createCategory
);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.put(
  "/:id",
  checkAuth,
  checkAdmin,
  multer.single("image"),
  categoryController.updateCategory
);
router.delete("/:id", checkAuth, checkAdmin, categoryController.deleteCategory);

module.exports = router;

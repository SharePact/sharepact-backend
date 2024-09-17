const express = require("express");
const requestDeleteController = require("../controllers/requestDelete");
const { checkAuth } = require("../middleware/checkauth");
const checkAdmin = require("../middleware/checkadmin");

const router = express.Router();

router.post("/", requestDeleteController.joinRequestdelete);
router.get(
  "/",
  checkAuth,
  checkAdmin,
  requestDeleteController.getrequestdeleteEntries
);
router.get("/:id", requestDeleteController.getrequestdeleteEntryById);
module.exports = router;

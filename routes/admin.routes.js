const express = require("express");

// Auth middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");

// Constants
const { SUPER_ADMIN, ADMIN } = require("../utils/constants");

// Classes
const AdminController = require("../controllers/admin.controller");
const AdminValidator = require("../validators/admin.validator");

// Router
const router = express.Router();

router
  .route("/")
  .post(
    protect,
    allowedTo(SUPER_ADMIN, ADMIN),
    AdminValidator.validateAddAdmin,
    AdminController.addAdmin
  );


module.exports = router;

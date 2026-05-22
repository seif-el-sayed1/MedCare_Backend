const express = require("express");

// Constants
const { DOCTOR, ADMIN, SUPER_ADMIN } = require("../utils/constants");

// Auth middleware
const { protect, allowedTo } = require("../middlewares/auth.middleware");

// Classes
const DoctorAuthController = require("../controllers/doctorAuth.controller");
const GlobalValidator = require("../validators/global.validator");

// Router
const router = express.Router();

// Auth Routes
router.route("/login").post(GlobalValidator.validateLogin, DoctorAuthController.login);

router
  .route("/verify-account")
  .post(
    protect,
    allowedTo(DOCTOR),
    GlobalValidator.validateNewPassword,
    DoctorAuthController.verifyAccount
  );

router
  .route("/reset-password")
  .patch(
    protect,
    allowedTo(DOCTOR),
    GlobalValidator.validateChangePassword,
    DoctorAuthController.doctorChangePassword
  );

// Reset Password Routes
router.route("/forget-password").post(DoctorAuthController.doctorForgotPassword);

router
  .route("/reset-password/:token")
  .patch(GlobalValidator.validateNewPassword, DoctorAuthController.doctorResetPassword);

module.exports = router;

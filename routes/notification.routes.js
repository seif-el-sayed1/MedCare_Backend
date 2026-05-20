const express = require("express");
const router = express.Router();

// Auth middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");


// Constants
const { USER, SUPER_ADMIN, ADMIN } = require("../utils/constants");

// Classes
const NotificationController = require("../controllers/notification.controller");

router
  .route("/me")
  .get(protect, allowedTo(USER, ADMIN, SUPER_ADMIN), NotificationController.getUserNotifications);
  

  router
  .route("/mark/all/seen")
  .patch(protect, allowedTo(USER, ADMIN, SUPER_ADMIN), NotificationController.markAllNotificationsAsSeen);

  router
  .route("/mark/:id/seen")
  .patch(
    protect,
    allowedTo(USER, ADMIN, SUPER_ADMIN),
    NotificationController.markNotificationAsSeen
  );


module.exports = router;

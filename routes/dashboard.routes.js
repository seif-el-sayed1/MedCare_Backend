const express = require("express");
// Classes
const DashboardController = require("../controllers/dashboard.controller");
// Middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");
const { ADMIN, SUPER_ADMIN } = require("../utils/constants");
// Router
const router = express.Router();



router.route("/users").get(
    protect,
    allowedTo(ADMIN, SUPER_ADMIN),
    DashboardController.getAllUsers
)

router.route("/stats")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getOverviewStats
    )

router.route("/appointments-chart")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getAppointmentsChart
    )

router.route("/revenue-chart")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getRevenueChart
    )

router.route("/top-doctors")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getTopDoctors
    )

router.route("/specializations-chart")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getSpecializationsChart
    )

router.route("/payments-status-chart")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getPaymentsStatusChart
    )

router.route("/new-users-chart")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getNewUsersChart
    )

router.route("/recent-appointments")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getRecentAppointments
    )

router.route("/recent-payments")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        DashboardController.getRecentPayments
    )


module.exports = router;
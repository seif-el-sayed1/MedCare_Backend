const asyncHandler = require("express-async-handler");
const prisma = require("../startup/db");
const ApiError = require("../utils/ApiError");
const ApiFeatures = require("../utils/ApiFeatures");

class DashboardController {

  // @desc get all users
  // @route GET /api/v1/users
  // @access Private (Admin)
  getAllUsers = asyncHandler(async (req, res, next) => {
      const apiFeatures = new ApiFeatures(prisma.user, req.query, "User")
          .search()
          .filter()
          .sort()
          .paginate()

      const data = await apiFeatures.execute()

      await apiFeatures.calculatePagination()

      res.status(200).json({
          success: true,
          results: data.length,
          pagination: apiFeatures.paginationResult,
          data
      })
  })

  //@desc     Get overview stats (users, doctors, appointments, revenue)
  //@route    GET /api/dashboard/stats
  //@access   Private (ADMIN, SUPER_ADMIN)
  getOverviewStats = asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalUsers,
      totalDoctors,
      totalAppointments,
      todayAppointments,
      cancelledAppointments,
      completedAppointments,
      absentAppointments,
      monthlyRevenue,
      totalRevenue,
      pendingWaitingList,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true, isBlocked: false } }),
      prisma.doctor.count({ where: { isDeleted: false } }),
      prisma.appointment.count(),
      prisma.appointment.count({
        where: { appointmentDate: { gte: startOfToday } },
      }),
      prisma.appointment.count({
        where: { appointmentStatus: "CANCELLED" },
      }),
      prisma.appointment.count({
        where: { appointmentStatus: "COMPLETED" },
      }),
      prisma.appointment.count({
        where: { appointmentStatus: "ABSENT" },
      }),
      prisma.payment.aggregate({
        _sum: { billedAmount: true },
        where: {
          status: "SUCCESS",
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.payment.aggregate({
        _sum: { billedAmount: true },
        where: { status: "SUCCESS" },
      }),
      prisma.waitingList.count({ where: { status: "WAITING" } }),
    ]);

    const cancellationRate =
      totalAppointments > 0
        ? ((cancelledAppointments / totalAppointments) * 100).toFixed(1)
        : 0;

    res.status(200).json({
      status: "success",
      data: {
        users: { total: totalUsers },
        doctors: { total: totalDoctors },
        appointments: {
          total: totalAppointments,
          today: todayAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
          absent: absentAppointments,
          cancellationRate: `${cancellationRate}%`,
        },
        revenue: {
          total: totalRevenue._sum.billedAmount || 0,
          monthly: monthlyRevenue._sum.billedAmount || 0,
        },
        waitingList: { pending: pendingWaitingList },
      },
    });
  });

}

module.exports = new DashboardController();
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

  //@desc     Get appointments chart data grouped by period
  //@route    GET /api/dashboard/appointments-chart?period=daily|weekly|monthly
  //@access   Private (ADMIN, SUPER_ADMIN)
  getAppointmentsChart = asyncHandler(async (req, res) => {
    const { period = "monthly" } = req.query;

    const now = new Date();
    let startDate;
    let groupFormat;

    if (period === "daily") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      groupFormat = "day";
    } else if (period === "weekly") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 84);
      groupFormat = "week";
    } else {
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 12);
      groupFormat = "month";
    }

    const appointments = await prisma.appointment.findMany({
      where: { appointmentDate: { gte: startDate } },
      select: {
        appointmentDate: true,
        appointmentStatus: true,
      },
      orderBy: { appointmentDate: "asc" },
    });

    const grouped = {};
    appointments.forEach((apt) => {
      const date = new Date(apt.appointmentDate);
      let key;

      if (groupFormat === "day") {
        key = date.toISOString().split("T")[0];
      } else if (groupFormat === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, completed: 0, cancelled: 0, absent: 0 };
      }
      grouped[key].total++;
      if (apt.appointmentStatus === "COMPLETED") grouped[key].completed++;
      if (apt.appointmentStatus === "CANCELLED") grouped[key].cancelled++;
      if (apt.appointmentStatus === "ABSENT") grouped[key].absent++;
    });

    const chartData = Object.entries(grouped).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    res.status(200).json({ status: "success", period, data: chartData });
  });

  //@desc     Get monthly revenue chart data for the last 12 months
  //@route    GET /api/dashboard/revenue-chart
  //@access   Private (ADMIN, SUPER_ADMIN)
  getRevenueChart = asyncHandler(async (req, res) => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 12);

    const payments = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        createdAt: { gte: startDate },
      },
      select: {
        billedAmount: true,
        createdAt: true,
        appointment: { select: { paymentType: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const grouped = {};
    payments.forEach((p) => {
      const date = new Date(p.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped[key]) {
        grouped[key] = { total: 0, fullyPaid: 0, partiallyPaid: 0 };
      }
      grouped[key].total += p.billedAmount || 0;
      if (p.appointment?.paymentType === "FULLY_PAID") {
        grouped[key].fullyPaid += p.billedAmount || 0;
      } else {
        grouped[key].partiallyPaid += p.billedAmount || 0;
      }
    });

    const chartData = Object.entries(grouped).map(([month, amounts]) => ({
      month,
      total: parseFloat(amounts.total.toFixed(2)),
      fullyPaid: parseFloat(amounts.fullyPaid.toFixed(2)),
      partiallyPaid: parseFloat(amounts.partiallyPaid.toFixed(2)),
    }));

    res.status(200).json({ status: "success", data: chartData });
  });

}

module.exports = new DashboardController();
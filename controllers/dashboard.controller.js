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

}

module.exports = new DashboardController();
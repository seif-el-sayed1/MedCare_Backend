const asyncHandler = require("express-async-handler");
const EmailController = require("./email.controller");
const ApiError = require("../utils/ApiError.js");
const { translate} = require("../utils/translation.js");
const prisma = require("../startup/db.js")
const Auth = require("../utils/auth.js")
const { ADMIN } = require("../utils/constants.js")
const ApiFeatures = require("../utils/apiFeatures.js");

class AdminController {

  // @desc    Add new admin
  // @route   POST /admin
  // @access  Private
  addAdmin = asyncHandler(async(req, res, next) => {
    const { firstName, lastName, email } = req.body;
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      return next(new ApiError(translate("Admin already exists", req.user.lang), 400));
    }
    const admin = await prisma.admin.create({ data: { firstName, lastName, email, password: "PENDING" } });

    // Generate token for verification email
    const tokenData = await Auth.generateToken(admin.id, ADMIN, "admin")
    // Send verification mail
    await EmailController.adminVerificationEmail(tokenData.token, email);

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: admin.fullName,
        email: admin.email,
        isVerified: admin.isVerified,
        phone: admin.phone
      }
    });
  })  

  //@desc   Get all admins
  //@route  GET /admin
  //@access Private
  getAllAdmins = asyncHandler(async (req, res, next) => {

    const apiFeatures = new ApiFeatures(
        prisma.admin,
        req.query,
        "Admin"
    )
        .search()
        .filter()
        .sort()
        .paginate()

    await apiFeatures.calculatePagination();

    const admins = await apiFeatures.execute();

    res.status(200).json({
        success: true,
        message: "Admins fetched successfully",
        pagination: apiFeatures.paginationResult,
        results: admins.length,
        data: admins
    });
  });

  //@desc   Get single admin
  //@route  GET /admin/:id
  //@access Private
  getOneAdmin = asyncHandler(async (req, res, next) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.params.id } });
    if (!admin) {
      return next(new ApiError(translate("Admin not found", req.user.lang), 404));
    }
    res.status(200).json({
      success: true,
      message: "Admin fetched successfully",
      data: admin
    });
  });

  // @desc    Update admin
  // @route   PATCH /admin/:id
  // @access  Private
  updateAdmin = asyncHandler(async (req, res, next) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.params.id } });
    if (!admin) {
      return next(new ApiError(translate("Admin not found", req.user.lang), 404));
    }
    const updatedAdmin = await prisma.admin.update({ where: { id: req.params.id }, data: req.body });
    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin
    });
  });

  // @desc    Delete admin
  // @route   DELETE /admin/:id
  // @access  Private
  deleteAdmin = asyncHandler(async (req, res, next) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.params.id } });
    if (!admin) {
      return next(new ApiError(translate("Admin not found", req.user.lang), 404));
    }
    await prisma.admin.delete({ where: { id: req.params.id } });
    res.status(200).json({
      success: true,
      message: "Admin deleted successfully"
    });
  });

  // @desc    Get admin profile
  // @route   GET /admin/profile
  // @access  Private
  getAdminProfile = asyncHandler(async (req, res, next) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });
    if (!admin) {
      return next(new ApiError(translate("Admin not found", req.user.lang), 404));
    }
    res.status(200).json({
      success: true,
      message: "Admin profile fetched successfully",
      data: admin
    });
  });

    
}

module.exports = new AdminController();
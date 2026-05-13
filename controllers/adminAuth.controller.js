const crypto = require("crypto");
const prisma = require("../startup/db")
const asyncHandler = require("express-async-handler")
const Auth = require("../utils/auth")
const EmailController = require("./email.controller");
const { translate} = require("../utils/translation");
const { ADMIN } = require("../utils/constants")
const ApiError = require("../utils/ApiError")


class AdminAuthController{
  // @desc    Admin login
  // @route   POST /admin/auth/login
  // @access  Public
  login = asyncHandler(async (req, res, next) => {
    const lang = req.headers.lang || "en";
    const { email, password } = req.body;

    if (!email) {
        return next(
            new ApiError(
                translate("Email field is required", lang),
                400
            )
        );
    }
    if (!password) {
        return next(
            new ApiError(
                translate("Password field is required", lang),
                400
            )
        );
    }
    const admin = await prisma.admin.findUnique({
        where: {
            email
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            email: true,
            password: true,
            isDeleted: true,
            isBlocked: true,
            isVerified: true
        }
    });
    if (!admin || admin.isDeleted) {
        return next(
            new ApiError(
                translate("Incorrect email or password", lang),
                401
            )
        );
    }
    //check correct password
    const isMatched = await Auth.comparePassword(
        admin, 
        password
    );
    if (!isMatched) {
        return next(
            new ApiError(
                translate("Incorrect email or password", lang),
                401
            )
        );
    }
    //check if the admin is blocked
    if (admin.isBlocked) {
        return next(
            new ApiError(
                translate(
                    "Your account has been blocked. Please contact the super admin",
                    lang
                ),
                403
            )
        );
    }
    // Response message
    let message = `Welcome back ${admin.firstName}!`;
    // Check if account is verified
    if (!admin.isVerified) {

        // Generate token for verification email
        const tokenData = await Auth.generateToken(
            admin.id,
            ADMIN,
            "admin"
        );
        // Send verification mail
        await EmailController.adminVerificationEmail(
            tokenData.token,
            admin.email
        );
        return res.status(200).json({
            success: true,
            message: "Verification code is sent to your email address"
        });
    }

    // in case the admin account is not verified
    const tokenData = await Auth.generateToken(
        admin.id,
        ADMIN,
        "admin"
    );
    await prisma.admin.update({
        where: {
            id: admin.id
        },
        data: {
            token: tokenData.token,
            tokenExpDate: tokenData.tokenExpDate
        }
    });
    // Response admin data
    const { password: _, ...adminData } = admin;

    // response
    res.status(200).json({
        success: true,
        message,
        data: adminData,
        token: tokenData.token,
        tokenExpDate: tokenData.tokenExpDate
    });
  });

  // @desc    Change logged in admin password
  // @route   PATCH /admin/auth/changePassword
  // @access  Private
  adminChangePassword = asyncHandler(async (req, res,next) => {
    const admin = req.user
    const { currentPassword, newPassword } = req.body;
    const lang = req.headers.lang || "en"

    //compare current password
    if (!await Auth.comparePassword(admin, currentPassword)){
      return next(new ApiError(translate("Incorrect current password", lang), 400))
    }
    //new password must be different from the current password
    if (await Auth.comparePassword(admin, newPassword)){
      return next(new ApiError(translate("New password must be different from the current password", lang), 400));
    }

    await prisma.admin.update({
      where: {id: admin.id},
      data: {
        password: await Auth.hashPassword(req.body.newPassword),
        passwordChangedAt: new Date()  
      }
    })

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  })

  // @desc    Account verification code
  // @route   POST /admin/auth/verifyAccount
  // @access  Public
  verifyAccount = asyncHandler(async (req, res, next) => {
    const admin = req.user
    const { password } = req.body
    const lang = req.headers.lang || "en"

    // Check if admin is already verified
    if (admin.isVerified) return next(new ApiError(translate("This account is already verified", lang), 400));
    
    // Update admin document only if not already verified
    await prisma.admin.update({
      where: {id: admin.id},
      data: {
        isVerified: true,
        password: await Auth.hashPassword(password),
        passwordChangedAt: new Date()
      }
    })
    
    res.status(200).json({
      success: true,
      message: "Account verified successfully"
    });
  })


}



module.exports = new AdminAuthController();
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../startup/db");
const ApiError = require("../utils/ApiError");
const ApiFeatures = require("../utils/ApiFeatures");
const Auth = require("../utils/auth");
const { translate } = require("../utils/translation");
const { DOCTOR } = require("../utils/constants");
const EmailController = require("./email.controller");

class DoctorAuthController {
    //@desc    Doctor login
    //@route   POST /doctors/auth/login
    //@access  Private(Doctor)
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
        const doctor = await prisma.doctor.findUnique({
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
                isVerified: true,
                profilePicture: true,
            }
        });
        if (!doctor || doctor.isDeleted) {
            return next(
                new ApiError(
                    translate("Incorrect email or password", lang),
                    401
                )
            );
        }
        //check correct password
        const isMatched = await Auth.comparePassword(
            doctor, 
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
        
        // Response message
        let message = `Welcome back Dr.${doctor.firstName}!`;
        // Check if account is verified
        if (!doctor.isVerified) {

            // Generate token for verification email
            const tokenData = await Auth.generateToken(
                doctor.id,
                DOCTOR,
                "doctor"
            );
            // Send verification mail
            await EmailController.doctorVerificationEmail(
                tokenData.token,
                doctor.email
            );
            return res.status(200).json({
                success: true,
                message: "Verification code is sent to your email address"
            });
        }

        // in case the doctor account is not verified
        const tokenData = await Auth.generateToken(
            doctor.id,
            DOCTOR,
            "doctor"
        );
        await prisma.doctor.update({
            where: {
                id: doctor.id
            },
            data: {
                token: tokenData.token,
                tokenExpDate: tokenData.tokenExpDate
            }
        });
        // Response doctor data
        const { password: _, ...doctorData } = doctor;

        // response
        res.status(200).json({
            success: true,
            message,
            data: doctorData,
            token: tokenData.token,
            tokenExpDate: tokenData.tokenExpDate
        });
    });

    //@desc Doctor loggedin Change password
    //@route POST /doctors/auth/change-password
    //@access Private(Doctor)
    doctorChangePassword = asyncHandler(async (req, res,next) => {
        const doctor = req.user
        const { currentPassword, newPassword } = req.body;
        const lang = req.headers.lang || "en"
    
        //compare current password
        if (!await Auth.comparePassword(doctor, currentPassword)){
          return next(new ApiError(translate("Incorrect current password", lang), 400))
        }
        //new password must be different from the current password
        if (await Auth.comparePassword(doctor, newPassword)){
          return next(new ApiError(translate("New password must be different from the current password", lang), 400));
        }
    
        await prisma.doctor.update({
          where: {id: doctor.id},
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

}

module.exports = new DoctorAuthController()
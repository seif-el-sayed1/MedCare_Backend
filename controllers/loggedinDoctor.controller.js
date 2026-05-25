const asyncHandler = require("express-async-handler");
const prisma = require("../startup/db");
const ApiError = require("../utils/ApiError");
const ApiFeatures = require("../utils/ApiFeatures");

class LoggedInDoctorController {

    //@desc Update doctor profile
    //@route PATCH /api/v1/loggedin-docs/update
    //@access Private
    updateDoctorProfile = asyncHandler(async(req, res, next) => {
        const allowedFields = ["firstName", "lastName", "email", "phone", "bio","experienceYears", "profilePicture"];

        console.log("Request body:", req.body); // Log the request body to see what fields are being sent
        // return error if request body contains fields that are not allowed
        const requestFields = Object.keys(req.body);
        const isValidOperation = requestFields.every(field => allowedFields.includes(field));
        if (!isValidOperation) {
            return next(new ApiError("Invalid fields in request body", 400));
        }

        const doctor = await prisma.doctor.findUnique({
            where: {
                id: req.user.id
            }
        })
        if (!doctor) {
            return next(new ApiError("Doctor not found", 404));
        }
        

        const updatedDoctor = await prisma.doctor.update({
            where: {
                id: req.user.id
            },
            data: req.body,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                bio: true,
                profilePicture: true,
                experienceYears: true
            }
        })

        res.status(200).json({
            success: true,
            data: updatedDoctor
        })

    })

    //@desc Get doctor profile
    //@route GET /api/v1/loggedin-docs/me
    //@access Private
    getDoctorProfile = asyncHandler(async(req, res, next) => {
        const doctor = await prisma.doctor.findUnique({
            where: {
                id: req.user.id
            }
        })
        if (!doctor) {
            return next(new ApiError("Doctor not found", 404));
        }
        res.status(200).json({
            success: true,
            data: doctor
        })
    })

}

module.exports = new LoggedInDoctorController();
const asyncHandler = require("express-async-handler");
const prisma = require("../startup/db");
const ApiError = require("../utils/ApiError");
const ApiFeatures = require("../utils/ApiFeatures");
const updateDoctorRating = require("../utils/updateDoctorRating");

class RatingController {

    // @desc Create a new rating
    // @route POST /ratings
    // @access Public
    createRating = asyncHandler(async (req, res, next) => {
        const { doctorId } = req.params;

        const hasCompletedAppointment = await prisma.appointment.findFirst({
            where: {
                userId: req.user.id,
                doctorId: doctorId,
                appointmentStatus: "COMPLETED"
            }
        });

        if (!hasCompletedAppointment) {
            return next(new ApiError("You cannot rate this doctor unless you have at least one completed appointment with them.", 403));
        }

        const existingRating = await prisma.rating.findFirst({
            where: {
                userId: req.user.id,
                doctorId
            }
        });

        if (existingRating) {
            return next(new ApiError("You have already rated this doctor", 400));
        }

        const rating = await prisma.rating.create({
            data: { 
                ...req.body,
                userId: req.user.id, 
                doctorId: doctorId  
            }
        });

        await updateDoctorRating(doctorId);

        res.status(201).json({
            success: true,
            message: "Rating created successfully",
            data: rating
        });
    });

    //@desc update a rating
    //@route patch /ratings/:id
    //@access Public
    updateRating = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const { rating, review } = req.body;

        const existing = await prisma.rating.findUnique({
            where: { id },
            select: { doctorId: true }
        });

        if (!existing) {
            return next(new ApiError("Rating not found", 404));
        }

        const updatedRating = await prisma.rating.update({
            where: { id },
            data: { rating, review }
        });

        await updateDoctorRating(existing.doctorId);

        res.status(200).json({
            success: true,
            message: "Rating updated successfully",
            data: updatedRating
        });
    });

    //@desc delete a rating
    //@route delete /ratings/:id
    //@access Public
    deleteRating = asyncHandler(async (req, res, next) => {
        const { id } = req.params;

        const existing = await prisma.rating.findUnique({
            where: { id },
            select: { doctorId: true }
        });

        if (!existing) {
            return next(new ApiError("Rating not found", 404));
        }

        await prisma.rating.delete({
            where: { id }
        });

        await updateDoctorRating(existing.doctorId);

        res.status(200).json({
            success: true,
            message: "Rating deleted successfully"
        });
    });

}

module.exports = new RatingController()

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

    //@desc Get doctor appointments
    //@route GET /api/v1/loggedin-docs/appointments
    //@access Private
    getMyAppointments = asyncHandler(async (req, res) => {
        const doctorId = req.user.id;

        const features = new ApiFeatures(
            prisma.appointment,
            req.query,
            "Appointment",
            {
                where: {
                    doctorId
                },
                select: {
                    id: true,
                    appointmentDate: true,
                    appointmentStatus: true,
                    appointmentCode: true,
                    totalPrice: true,
                    paidAmount: true,
                    remainingAmount: true,
                    isPaid: true,
                    isFullPaid: true,
                    paymentType: true,
                    notes: true,
                    hasConsultation: true,
                    consultationDate: true,
                    createdAt: true,

                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            email: true
                        }
                    }
                }
            }
        )
            .search()
            .filter()
            .sort()
            .paginate();

        const data = await features.execute();

        await features.calculatePagination();

        res.status(200).json({
            success: true,
            message: "Doctor appointments fetched successfully",
            data,
            pagination: features.paginationResult
        });
    });

    //@desc write appointment diagnosis
    //@route PATCH /api/v1/loggedin-docs/appointments/:id/diagnosis
    //@access Private
    writeDiagnosis = asyncHandler(async(req, res, next) => {
        const { id } = req.params;
        const { diagnosis } = req.body;

        if (!diagnosis) {
            return next(new ApiError("Diagnosis is required", 400));
        }
        
        const appointment = await prisma.appointment.findUnique({
            where: {
                id
            }
        })
        if (!appointment) {
            return next(new ApiError("Appointment not found", 404));
        }

        if(appointment.doctorId !== req.user.id) {
            return next(new ApiError("You are not authorized to write diagnosis for this appointment", 403));
        }
        if (appointment.appointmentStatus !== "COMPLETED") {
            return next(new ApiError("Cannot write diagnosis for an appointment that is not completed", 400));
        }

        const updatedAppointment = await prisma.appointment.update({
            where: {
                id
            },
            data: {
                notes: diagnosis
            }
        })

        res.status(200).json({
            success: true,
            message: "Diagnosis written successfully",
            data: updatedAppointment
        })
    })

    //@desc get my rating by api features
    //@route GET /api/v1/loggedin-docs/my-rating
    //@access Private
    getMyRatings = asyncHandler(async(req, res, next) => {
        const doctorId = req.user.id;

        const features = new ApiFeatures(
            prisma.rating,
            req.query,
            "Rating",
            {
                where: {
                    doctorId
                },
                select: {
                    id: true,
                    rating: true,
                    review: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            email: true
                        }
                    }
                }
            }
        )
            .search()
            .filter()
            .sort()
            .paginate();

        const data = await features.execute();

        await features.calculatePagination();

        const doctor = await prisma.doctor.findUnique({
            where: {
                id: doctorId
            },
            select: {
                ratingsAverage: true,
                ratingQuantity: true
            }
        });

        res.status(200).json({
            success: true,
            message: "My rating fetched successfully",
            data,
            averageRate: doctor.ratingsAverage,
            ratingQuantity: doctor.ratingQuantity,
            pagination: features.paginationResult
        });
    });

}

module.exports = new LoggedInDoctorController();
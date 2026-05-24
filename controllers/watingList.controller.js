const asyncHandler = require("express-async-handler");
const prisma = require("../startup/db");
const ApiFeatures = require("../utils/ApiFeatures");
const ApiError = require("../utils/ApiError");

class WatingListController{

    //@desc add user to wating list
    //@route POST /api/v1/wating-list
    //@access private
    addToWaitingList = asyncHandler(async (req, res, next) => {

        const { doctorId, requestedDate, paymentType } = req.body
        const userId = req.user.id

        const appointmentDate = new Date(requestedDate)

        // 1. Check if slot already booked
        const existingAppointment = await prisma.appointment.findFirst({
            where: {
                doctorId,
                appointmentDate: appointmentDate,
                appointmentStatus: {
                    in: ["PENDING", "CONFIRMED"]
                }
            }
        })

        if (existingAppointment && existingAppointment.userId === userId) {
            return next(new ApiError("You have already booked this appointment slot, you cannot join waiting list", 400))
        }

        if (!existingAppointment) {
            return next(new ApiError("This slot is available, you can book it directly without joining waiting list", 400))
        }

        // 2. Check if already in waiting list
        const exists = await prisma.waitingList.findFirst({
            where: {
                userId,
                doctorId,
                requestedDate: appointmentDate
            }
        })

        if (exists) {
            return next(new ApiError("You are already in the waiting list", 400))
        }

        // 3. Add to waiting list
        const waiting = await prisma.waitingList.create({
            data: {
                userId,
                doctorId,
                paymentType,
                requestedDate: appointmentDate,
            }
        })

        res.status(201).json({
            success: true,
            message: "Added to waiting list successfully",
            data: waiting
        })
    })

    //@desc get user wating list
    //@route GET /api/v1/wating-list
    //@access private
    getAllWaitingList = asyncHandler(async (req, res, next) => {

        const features = new ApiFeatures(prisma.waitingList, req.query, "WaitingList",)
            .filter()
            .sort()
            .paginate()

        await features.calculatePagination()

        const data = await features.execute({
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                doctor: {
                    select: {
                        firstName: true,
                        lastName: true,
                        specialization: true,
                        consultationPrice: true
                    }
                }
            }
        })

        res.status(200).json({
            message: "Waiting list fetched successfully",
            pagination: features.paginationResult,
            data
        })
    })

}



module.exports = new WatingListController()
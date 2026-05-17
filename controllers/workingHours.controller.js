const asyncHandler = require("express-async-handler");
const prisma = require("../startup/db");
const ApiError = require("../utils/ApiError");
const ApiFeatures = require("../utils/ApiFeatures");

class WorkingHoursController {

    //@desc add working hours for doctor
    //@route POST /doctors/:id/working-hours
    //@access private
    addWorkingHours = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        // Check doctor exists
        const existingDoctor = await prisma.doctor.findUnique({
            where: { id }
        });

        if (!existingDoctor) {
            return next(new ApiError("Doctor not found", 404));
        }

        // Add doctorId to every working hour
        const workingHoursData = req.body.workingHours.map((item) => ({
            ...item,
            doctorId: id
        }));

        // Create working hours
        await prisma.workingHours.createMany({
            data: workingHoursData
        });

        // Get updated doctor with working hours
        const doctor = await prisma.doctor.findUnique({
            where: { id },
            include: {
                workingHours: true
            }
        });

        res.status(201).json({
            success: true,
            message: "Working hours added successfully",
            data: doctor
        });
    });

    //@desc update working hours for doctor
    //@route patch /doctors/:id/working-hours/:whId
    //@access private
    updateWorkingHours = asyncHandler(async (req, res, next) => {
        const { id, whId } = req.params;

        // check working hours exists for this doctor
        const existingWorkingHours = await prisma.workingHours.findFirst({
            where: {
                id: whId,
                doctorId: id
            }
        });

        if (!existingWorkingHours) {
            return next(new ApiError("Working hours not found", 404));
        }

        // update working hours
        const updatedWorkingHours = await prisma.workingHours.update({
            where: {
                id: whId,
                doctorId: id
            },
            data: req.body
        });

        res.status(200).json({
            success: true,
            message: "Working hours updated successfully",
            data: updatedWorkingHours
        });
    });

    //@desc delete working hours for doctor
    //@route delete /doctors/:id/working-hours/:whId
    //@access private
    deleteWorkingHours = asyncHandler(async (req, res, next) => {
        const { id, whId } = req.params;

        // check working hours exists for this doctor
        const existingWorkingHours = await prisma.workingHours.findFirst({
            where: {
                id: whId,
                doctorId: id
            }
        });

        if (!existingWorkingHours) {
            return next(new ApiError("Working hours not found", 404));
        }

        // delete working hours
        await prisma.workingHours.delete({
            where: {
                id: whId,
                doctorId: id
            }
        });

        res.status(200).json({
            success: true,
            message: "Working hours deleted successfully"
        });
    });

    //@desc add doctor leave
    //@route PATCH /doctors/:id/leaves
    //@access private
    addDoctorLeave = asyncHandler(async (req, res, next) => {
        const { id } = req.params
        const days = req.body

        const doctor = await prisma.doctor.findUnique({ where: { id } })
        if (!doctor) return next(new ApiError("Doctor not found", 404))

        const today = new Date().getDay()

        for (const { day, weeksOfLeave } of days) {
            if (day < today) return next(new ApiError(`${dayNames[day]} has already passed`, 400))

            const workingHours = await prisma.workingHours.findUnique({
                where: { doctorId_dayOfWeek: { doctorId: id, dayOfWeek: day } }
            })
            if (!workingHours) return next(new ApiError(`Doctor doesn't work on ${dayNames[day]}`, 400))
            if (!workingHours.isAvailable) return next(new ApiError(`${dayNames[day]} already has a leave`, 400))

            await prisma.workingHours.update({
                where: { doctorId_dayOfWeek: { doctorId: id, dayOfWeek: day } },
                data: { isAvailable: false, weeksOfLeave }
            })
        }

        res.status(200).json({
            success: true,
            message: "Doctor leave added successfully"
        })
    })
    
}

module.exports = new WorkingHoursController()
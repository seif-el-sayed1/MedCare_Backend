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
    
}

module.exports = new WorkingHoursController()
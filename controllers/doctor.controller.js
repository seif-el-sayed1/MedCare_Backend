const asyncHandler = require("express-async-handler")
const prisma = require("../startup/db")
const ApiFeatures = require("../utils/ApiFeatures")
const ApiError = require("../utils/ApiError")
const { translate } = require("../utils/translation")
const {getAvailableSlots} = require("../utils/getAvaliabeSlots")

const dayNames = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday"
}
class DoctorController {

    // @desc add doctor
    // @route POST /doctors
    // @access private
    addDoctor = asyncHandler(async (req, res, next) => {
        const { email, workingHours, ...doctorData } = req.body
        
        const existDoctor = await prisma.doctor.findUnique({
            where: { email }
        })
        if (existDoctor) return next(new ApiError("Doctor already exist", 400))

        const doctor = await prisma.doctor.create({
            data: {
                ...doctorData,
                email,
                workingHours: {
                    create: workingHours
                }
            },
            include: {
                workingHours: true
            }
        })

        res.status(201).json({
            success: true,
            message: "Doctor created successfully",
            data: doctor
        })
    })

    //@desc get all doctors
    //@route GET /doctors
    //@access public
    getAllDoctors = asyncHandler(async (req, res, next) => {

        const apiFeatures = new ApiFeatures(prisma.doctor, req.query, "Doctor")
            .search()
            .filter()
            .sort()
            .paginate()
            .cleanResponse();

        const data = await apiFeatures.execute();

        await apiFeatures.calculatePagination();

        res.status(200).json({
            success: true,
            results: data.length,
            pagination: apiFeatures.paginationResult,
            data
        });
    });

    //@desc get single doctor
    //@route GET /doctors/:id
    //@access public
    getOneDoctor = asyncHandler(async (req, res, next) => {
        const { id } = req.params;

        const doctor = await prisma.doctor.findUnique({
            where: { id },
            include: {
                workingHours: true,
            }

        });
        if (!doctor) return next(new ApiError("Doctor not found", 404));

        res.status(200).json({
            success: true,
            data: doctor
        });
    });

    //@desc update doctor
    //@route PUT /doctors/:id
    //@access private
    updateDoctor = asyncHandler(async (req, res, next) => {
        const { id } = req.params;

        const existDoctor = await prisma.doctor.findUnique({
            where: { id }
        });
        if (!existDoctor) return next(new ApiError("Doctor not found", 404));

        const doctor = await prisma.doctor.update({
            where: { id },
            data: req.body,
            include: {
                workingHours: true,
            }
        });

        res.status(200).json({
            success: true,
            message: "Doctor updated successfully",
            data: doctor
        });
    });

    //@desc toggle delete doctor
    //@route PATCH /doctors/:id
    //@access private
    /**
     * This endpoint performs a soft delete for a doctor.
     * The doctor will be permanently (hard) deleted after 15 days
     * if it remains in a soft deleted state.
    */
    toggleDeleteDoctor = asyncHandler(async (req, res, next) => {
        const { id } = req.params;

        const existDoctor = await prisma.doctor.findUnique({
            where: { id }
        });

        if (!existDoctor) {
            return next(new ApiError("Doctor not found", 404));
        }

        const doctor = await prisma.doctor.update({
            where: { id },
            data: {
                isDeleted: !existDoctor.isDeleted
            }
        });

        res.status(200).json({
            success: true,
            message: doctor.isDeleted
                ? "Doctor deleted successfully"
                : "Doctor restored successfully",
            data: doctor
        });
    });


}

module.exports = new DoctorController()
const asyncHandler = require("express-async-handler")
const prisma = require("../startup/db")
const ApiFeatures = require("../utils/ApiFeatures")
const ApiError = require("../utils/ApiError")
const { translate } = require("../utils/translation")
const {getAvailableSlots} = require("../utils/getAvaliabeSlots")
const EmailController = require("./email.controller")
const Auth = require("../utils/auth")
const { DOCTOR } = require("../utils/constants")

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
                password: "PENDING",
                workingHours: {
                    create: workingHours
                }
            },
            include: {
                workingHours: true
            }
        })

        const tokenData = await Auth.generateToken(doctor.id, DOCTOR, "doctor")
        // Send verification mail
        await EmailController.doctorVerificationEmail(tokenData.token, email);
    

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
                ratings: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
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

    //@desc get doctor working hours
    //@route GET /doctors/:id/available-slots?date=YYYY-MM-DD
    //@access public
    getAvailableSlots = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date is required'
            });
        }

        const slots = await getAvailableSlots(id, new Date(date), req.user.id);

        // Handle validation errors from utility
        if (slots?.success === false) {
            return res.status(400).json(slots);
        }

        res.status(200).json({
            success: true,
            data: slots
        });

    });

}

module.exports = new DoctorController()
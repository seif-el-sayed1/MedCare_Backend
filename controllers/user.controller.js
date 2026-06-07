const asycnHandler = require("express-async-handler");
const prisma = require("../startup/db");
const ApiFeatures = require("../utils/ApiFeatures");

class UserController {
    // @desc    Get my profile
    // @route   GET /api/v1/users/me
    // @access  Private (User)
    getMyProfile = asycnHandler(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user.id,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                profilePicture: true,
                age: true,
                lang: true
            }
        });
        res.status(200).json({
            success: true,
            data: user,
        });
    });

    // @desc    Update my profile
    // @route   PATCH /api/v1/users/me
    // @access  Private (User)
    updateMyProfile = asycnHandler(async (req, res) => {
        const { firstName, lastName, phone, age } = req.body;
        const user = await prisma.user.update({
            where: {
                id: req.user.id,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                profilePicture: true,
                age: true,
                lang: true
            },
            data: {
                firstName,
                lastName,
                phone,
                age: parseInt(age)
            }
        });
        res.status(200).json({
            success: true,
            data: user,
        });
    });

    // @desc    Update my language
    // @route   PATCH /api/v1/users/lang
    // @access  Private (User)
    updateLang = asycnHandler(async (req, res) => {
        const { lang } = req.body;
        const user = await prisma.user.update({
            where: {
                id: req.user.id,
            },
            select: {
                id: true,
                lang: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                profilePicture: true,
                age: true,
            },
            data: {
                lang
            }
        });
        res.status(200).json({
            success: true,
            data: user,
        });
    });

    // @desc  Get My History
    // @route GET /api/v1/users/me/history
    // @access Private (User)
    getMyHistory = asycnHandler(async (req, res, next) => {
        const apiFeatures = new ApiFeatures(prisma.appointment, req.query, "Appointment", {
            where: { userId: req.user.id }
        })
            .search()
            .filter()
            .sort()
            .paginate()

        const data = await apiFeatures.execute({
            include: {
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialization: true,
                    }
                }
            }
        })

        await apiFeatures.calculatePagination()

        res.status(200).json({
            success: true,
            results: data.length,
            pagination: apiFeatures.paginationResult,
            data
        })
    })

    //@desc get my waiting list using apifeatues
    // @route GET /api/v1/users/me/waiting-list
    // @access Private (User)
    getMyWaitingList = asycnHandler(async (req, res, next) => {
        const apiFeatures = new ApiFeatures(prisma.waitingList, req.query, "WaitingList", {
            where: { userId: req.user.id }
        })
            .search()
            .filter()
            .sort()
            .paginate()

        const data = await apiFeatures.execute({
            include: {
                doctor: {
                    select: {
                        firstName: true,
                        lastName: true,
                        specialization: true,
                    }
                }
            }
        })

        await apiFeatures.calculatePagination()

        res.status(200).json({
            success: true,
            results: data.length,
            pagination: apiFeatures.paginationResult,
            data
        })
    })

    //@desc get one user 
    // @route GET /api/v1/users/:id
    // @access Private (Super Doctor)
    getOneUser = asycnHandler(async (req, res, next) => {
        const userId = req.params.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                profilePicture: true,
                age: true,
                lang: true
            }
        });
        res.status(200).json({
            success: true,
            data: user,
        });
    });

}

module.exports = new UserController();
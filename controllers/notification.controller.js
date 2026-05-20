const asyncHandler = require("express-async-handler")

// Prisma
const prisma = require("../startup/db")

// Utils
const ApiError = require("../utils/ApiError")
const ApiFeatures = require("../utils/ApiFeatures")
const { translate } = require("../utils/translation")

class NotificationController {

    // @desc    Get user notifications
    // @route   GET /notifications/user/myNotifications
    // @access  Private
    getUserNotifications = asyncHandler(async (req, res, next) => {
        const now = new Date()
        const { search } = req.query

        const where = {
            OR: [
                {
                    global: true,
                    createdAt: {
                        gte: req.user.createdAt
                    },
                    OR: [
                        {
                            scheduleTime: {
                                lte: now
                            }
                        },
                        {
                            scheduleTime: null
                        }
                    ]
                },
                {
                    userId: req.user.id,
                    createdAt: {
                        gte: req.user.createdAt
                    },
                    OR: [
                        {
                            scheduleTime: {
                                lte: now
                            }
                        },
                        {
                            scheduleTime: null
                        }
                    ]
                }
            ]
        }

        // Search
        if (search) {
            where.AND = [
                {
                    OR: [
                        {
                            title: {
                                contains: search,
                                mode: "insensitive"
                            }
                        },
                        {
                            body: {
                                contains: search,
                                mode: "insensitive"
                            }
                        }
                    ]
                }
            ]
        }

        // Pagination
        const page = Number(req.query.page) || 1
        const limit = Number(req.query.limit) || 20
        const skip = (page - 1) * limit

        // Sort
        const sort = req.query.sort || "createdAt"
        const order = req.query.order === "asc" ? "asc" : "desc"

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: {
                [sort]: order
            },
            skip,
            take: limit
        })

        res.status(200).json({
            success: true,
            totalResults: notifications.length,
            pagination: {
                page,
                limit
            },
            data: notifications
        })
    })

    // @desc    Mark one notification as Seen
    // @route   PATCH /notifications/mark/:id/seen
    // @access  Private
    markNotificationAsSeen = asyncHandler(async (req, res, next) => {

        const { id } = req.params

        const notification = await prisma.notification.findUnique({
            where: { id }
        })

        if (!notification) {
            return next(
                new ApiError(
                    translate("Notification not found", req.headers.lang),
                    404
                )
            )
        }

        await prisma.notification.update({
            where: { id },
            data: {
                seen: true
            }
        })

        res.status(200).json({
            success: true,
            message: "Notification is seen successfully"
        })
    })

}

module.exports = new NotificationController()
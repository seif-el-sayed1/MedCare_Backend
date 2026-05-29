const cron = require("node-cron");
const prisma = require("./db");
const { sendNotification } = require("../utils/sendNotification");

const sendAndSaveNotification = async ({ token, title, body, caseType, info, userId, global = false }) => {
    sendNotification({ token, title, body, caseType, info, global })

    await prisma.notification.create({
        data: {
            title,
            body,
            case: caseType,
            info,
            global,
            userId,
            seen: false
        }
    })
}

const cronJob = () => {

    // Run every Saturday at 12:00 AM ==> reset working hours
    cron.schedule("0 0 * * 5", async () => {
        try {
            await prisma.workingHours.updateMany({
                where: { weeksOfLeave: 0, isAvailable: false },
                data: { isAvailable: true }
            });

            await prisma.workingHours.updateMany({
                where: { weeksOfLeave: { gt: 0 } },
                data: { isAvailable: false, weeksOfLeave: { decrement: 1 } }
            });

            console.log("⚠️ Working hours cron executed successfully".red.bold);
        } catch (error) {
            console.log("Working Hours Cron Error:", error);
        }
    });

    // Run every day at 8:00 AM ==> send reminder for tomorrow appointments
    cron.schedule("0 8 * * *", async () => {
        try {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(0, 0, 0, 0)

            const dayAfterTomorrow = new Date(tomorrow)
            dayAfterTomorrow.setHours(23, 59, 59, 999)

            const appointments = await prisma.appointment.findMany({
                where: {
                    appointmentDate: {
                        gte: tomorrow,
                        lte: dayAfterTomorrow
                    },
                    appointmentStatus: "CONFIRMED"
                },
                include: {
                    user: {
                        select: { id: true, notificationToken: true }
                    },
                    doctor: {
                        select: { firstName: true, lastName: true }
                    }
                }
            })

            for (const appointment of appointments) {
                if (!appointment.user.notificationToken) continue

                await sendAndSaveNotification({
                    token: appointment.user.notificationToken,
                    title: "Appointment Reminder 🏥",
                    body: `You have an appointment tomorrow with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
                    caseType: "APPOINTMENT_REMINDER",
                    info: appointment.appointmentCode,
                    userId: appointment.user.id
                })
            }

            console.log(
                `⚠️ Sent reminders for ${appointments.length} appointments`
                    .red.bold
            )
        } catch (error) {
            console.log("Cron Error:", error)
        }
    })

    // Run every hour ==> 2-hour reminder + absent check
    cron.schedule("0 * * * *", async () => {
        try {
            const now = new Date()

            // 2-hour reminder
            const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
            const twoHoursLaterEnd = new Date(twoHoursLater.getTime() + 60 * 1000)

            const upcomingAppointments = await prisma.appointment.findMany({
                where: {
                    appointmentDate: { gte: twoHoursLater, lte: twoHoursLaterEnd },
                    appointmentStatus: "CONFIRMED"
                },
                include: {
                    user: { select: { id: true, notificationToken: true } },
                    doctor: { select: { firstName: true, lastName: true } }
                }
            })

            for (const appointment of upcomingAppointments) {
                if (!appointment.user.notificationToken) continue
                await sendAndSaveNotification({
                    token: appointment.user.notificationToken,
                    title: "Upcoming Appointment ⏰",
                    body: `Your appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName} is in 2 hours`,
                    caseType: "APPOINTMENT_UPCOMING",
                    info: appointment.appointmentCode,
                    userId: appointment.user.id
                })
            }

            console.log(`⚠️ 2-hour reminders sent for ${upcomingAppointments.length} appointments`.red.bold)

            // Absent check
            const absentAppointments = await prisma.appointment.findMany({
                where: {
                    appointmentDate: { lt: now },
                    appointmentStatus: "CONFIRMED",
                },
                include: {
                    user: { select: { id: true, notificationToken: true } },
                    doctor: { select: { firstName: true, lastName: true } }
                }
            })

            for (const appointment of absentAppointments) {
                await prisma.appointment.update({
                    where: { id: appointment.id },
                    data: { appointmentStatus: "CANCELLED" }
                })

                if (!appointment.user.notificationToken) continue
                await sendAndSaveNotification({
                    token: appointment.user.notificationToken,
                    title: "Missed Appointment 😔",
                    body: `You missed your appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
                    caseType: "APPOINTMENT_MISSED",
                    info: appointment.appointmentCode,
                    userId: appointment.user.id
                })
            }

            console.log(`⚠️ Absent appointments checked: ${absentAppointments.length}`.red.bold)
        } catch (error) {
            console.log("Hourly Cron Error:", error)
        }
    })

    // Run every 15 minutes ==> remind unpaid appointments & delete after 1 hour & waiting list
    cron.schedule("*/15 * * * *", async () => {
        try {
            const now = new Date()
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
            const fortyFiveMinAgo = new Date(now.getTime() - 45 * 60 * 1000)
            const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
            const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000)

            // Cancel expired unpaid appointments & notify waiting list
            const expiredAppointments = await prisma.appointment.findMany({
                where: {
                    appointmentStatus: "PENDING",
                    isPaid: false,
                    createdAt: { lte: oneHourAgo },
                    appointmentDate: { gt: oneHourFromNow }
                }
            })

            for (const appointment of expiredAppointments) {
                await prisma.$transaction(async (tx) => {
                    await tx.appointment.update({
                        where: { id: appointment.id },
                        data: { appointmentStatus: "CANCELLED" }
                    })

                    const nextInLine = await tx.waitingList.findFirst({
                        where: {
                            doctorId: appointment.doctorId,
                            requestedDate: {
                                gte: new Date(appointment.appointmentDate.getTime() - 60000),
                                lte: new Date(appointment.appointmentDate.getTime() + 60000)
                            },
                            status: "WAITING"
                        },
                        orderBy: { createdAt: "asc" },
                        include: { user: { select: { id: true, notificationToken: true } } }
                    })

                    if (!nextInLine) return

                    const newAppointment = await tx.appointment.create({
                        data: {
                            doctorId: appointment.doctorId,
                            userId: nextInLine.userId,
                            appointmentDate: appointment.appointmentDate,
                            paymentType: nextInLine.paymentType,
                            totalPrice: appointment.totalPrice,
                        }
                    })

                    await tx.waitingList.update({
                        where: { id: nextInLine.id },
                        data: { status: "ACCEPTED" }
                    })

                    if (nextInLine.user.notificationToken) {
                        await sendAndSaveNotification({
                            token: nextInLine.user.notificationToken,
                            title: "🎉 Slot Confirmed!",
                            body: `A slot has been assigned to you. Please complete payment within 1 hour to confirm your appointment.`,
                            caseType: "WAITING_LIST_ACCEPTED",
                            info: newAppointment.appointmentCode,
                            userId: nextInLine.user.id
                        })
                    }
                })
            }

            // Reject waiting list where slot is already confirmed and paid
            const waitingEntries = await prisma.waitingList.findMany({
                where: { status: "WAITING" },
                include: {
                    user: { select: { id: true, notificationToken: true } },
                    doctor: { select: { firstName: true, lastName: true } }
                }
            })

            for (const waiting of waitingEntries) {
                const slotTaken = await prisma.appointment.findFirst({
                    where: {
                        doctorId: waiting.doctorId,
                        appointmentDate: {
                            gte: new Date(waiting.requestedDate.getTime() - 60000),
                            lte: new Date(waiting.requestedDate.getTime() + 60000)
                        },
                        appointmentStatus: "CONFIRMED",
                        isPaid: true
                    }
                })

                if (!slotTaken) continue

                await prisma.waitingList.update({
                    where: { id: waiting.id },
                    data: { status: "REJECTED" }
                })

                if (waiting.user.notificationToken) {
                    await sendAndSaveNotification({
                        token: waiting.user.notificationToken,
                        title: "Slot No Longer Available 😔",
                        body: `Sorry, the slot you requested with Dr. ${waiting.doctor.firstName} ${waiting.doctor.lastName} has been taken`,
                        caseType: "WAITING_LIST_REJECTED",
                        info: waiting.id,
                        userId: waiting.user.id
                    })
                }
            }

            // Payment reminders
            const baseWhere = {
                appointmentStatus: "PENDING",
                isPaid: false,
                appointmentDate: { gt: oneHourFromNow }
            }

            const remind45 = await prisma.appointment.findMany({
                where: { ...baseWhere, createdAt: { lte: fifteenMinAgo, gt: thirtyMinAgo } },
                include: {
                    user: { select: { id: true, notificationToken: true } },
                    doctor: { select: { firstName: true, lastName: true } }
                }
            })

            for (const app of remind45) {
                if (!app.user.notificationToken) continue
                await sendAndSaveNotification({
                    token: app.user.notificationToken,
                    title: "🔔 45 Minutes Remaining",
                    body: `You have 45 minutes to complete payment for your appointment with Dr. ${app.doctor.firstName} ${app.doctor.lastName}.`,
                    caseType: "PAYMENT_REMINDER",
                    info: app.appointmentCode,
                    userId: app.user.id
                })
            }

            const remind30 = await prisma.appointment.findMany({
                where: { ...baseWhere, createdAt: { lte: thirtyMinAgo, gt: fortyFiveMinAgo } },
                include: {
                    user: { select: { id: true, notificationToken: true } },
                    doctor: { select: { firstName: true, lastName: true } }
                }
            })

            for (const app of remind30) {
                if (!app.user.notificationToken) continue
                await sendAndSaveNotification({
                    token: app.user.notificationToken,
                    title: "⏳ 30 Minutes Remaining",
                    body: `Please complete payment for your appointment with Dr. ${app.doctor.firstName} ${app.doctor.lastName}.`,
                    caseType: "PAYMENT_REMINDER",
                    info: app.appointmentCode,
                    userId: app.user.id
                })
            }

            const remind15 = await prisma.appointment.findMany({
                where: { ...baseWhere, createdAt: { lte: fortyFiveMinAgo, gt: oneHourAgo } },
                include: {
                    user: { select: { id: true, notificationToken: true } },
                    doctor: { select: { firstName: true, lastName: true } }
                }
            })

            for (const app of remind15) {
                if (!app.user.notificationToken) continue
                await sendAndSaveNotification({
                    token: app.user.notificationToken,
                    title: "⚠️ 15 Minutes Remaining!",
                    body: `Your appointment with Dr. ${app.doctor.firstName} ${app.doctor.lastName} will be cancelled if payment is not completed.`,
                    caseType: "PAYMENT_REMINDER",
                    info: app.appointmentCode,
                    userId: app.user.id
                })
            }

            console.log(`⚠️ Unpaid appointments cleanup executed`.red.bold)
        } catch (error) {
            console.log("Unpaid Appointments Cron Error:", error)
        }
    })

};

module.exports = cronJob;
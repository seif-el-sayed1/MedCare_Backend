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
                    hasConsultation: true
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

};

module.exports = cronJob;
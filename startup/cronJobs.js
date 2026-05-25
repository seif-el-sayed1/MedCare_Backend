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

};

module.exports = cronJob;
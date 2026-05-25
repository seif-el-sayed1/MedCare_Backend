const cron = require("node-cron");
const prisma = require("./db");
const { sendNotification } = require("../utils/sendNotification");

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

};

module.exports = cronJob;
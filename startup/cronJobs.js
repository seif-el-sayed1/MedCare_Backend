const cron = require("node-cron");
const prisma = require("./db");

const workingHoursCron = () => {

    // Run every day at 12:00 AM ==> delete doctors after 15 days soft delete
    cron.schedule("0 0 * * *", async () => {
        try {

            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - 15);

            await prisma.doctor.deleteMany({
                where: {
                    isDeleted: true,
                    deletedAt: {
                        lte: dateLimit
                    }
                }
            });

            console.log("⚠️ Doctors cleanup cron executed successfully".red.bold);

        } catch (error) {
            console.log("Doctors Cron Error:", error);
        }
    });

};

module.exports = workingHoursCron;
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const logger = require("../utils/logger");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

prisma
  .$connect()
  .then(() => {
    console.log("✅ Connected to database successfully!".green.bold);
    logger.info("✅ Connected to database successfully!");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    logger.error("❌ Database connection failed:", err);
  });

module.exports = prisma;
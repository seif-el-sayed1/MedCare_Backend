const prisma = require("./db");
require("colors");
const asyncHandler = require("express-async-handler");
const { SUPER_ADMIN } = require("../utils/constants");
const Auth = require("../utils/auth");

const createSuperAdmin = asyncHandler(async () => {
  const admin = await prisma.admin.findFirst({where: {isSuperAdmin: true }})
  if (!admin) {
    const admin = await prisma.admin.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        role: SUPER_ADMIN,
        email: process.env.SUPER_ADMIN_EMAIL,
        password: await Auth.hashPassword(process.env.SUPER_ADMIN_PASSWORD),
        isVerified: true,
        isSuperAdmin: true,
      } 
    })
    console.log("=== Super Admin created successfully ===".green);
  }
})

module.exports = createSuperAdmin;
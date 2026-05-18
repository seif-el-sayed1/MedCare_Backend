const appRouter = require("express").Router();
const BASE_URL = "/api/v1";

const ApiError = require("../utils/ApiError");
let adminRoutes = require("./admin.routes");
let adminAuthRoutes = require("./adminAuth.routes");
let userAuthRoutes = require("./userAuth.routes") 
let userRoutes = require("./user.routes")
let doctorRoutes = require("./doctor.route")
let appointmentRoutes = require("./appointment.routes")
let paymentRoutes = require("./payment.routes")
let watingListRoutes = require("./watingList.routes")

appRouter.use(`${BASE_URL}/admins`, adminRoutes);
appRouter.use(`${BASE_URL}/admins/auth`, adminAuthRoutes);
appRouter.use(`${BASE_URL}/users/auth`, userAuthRoutes);
appRouter.use(`${BASE_URL}/users`, userRoutes);
appRouter.use(`${BASE_URL}/doctors`, doctorRoutes);
appRouter.use(`${BASE_URL}/appointments`, appointmentRoutes);
appRouter.use(`${BASE_URL}/payments`, paymentRoutes);
appRouter.use(`${BASE_URL}/wating-list`, watingListRoutes);

appRouter.get("/", (req, res) => {
  res.status(200).json({
    status: true,
    message: "You're Server is up and running!"
  });
});

// Not Found Route
appRouter.use((req, res, next) => {
  next(new ApiError(`This Route (${req.originalUrl}) is not found`, 404));
});


module.exports = appRouter;

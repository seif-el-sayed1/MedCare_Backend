const express = require("express");
// Classes 
const AppointmentController = require("../controllers/appointment.controller");
const AppointmentValidator = require("../validators/appointment.validator")
//middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");
const { USER, ADMIN, SUPER_ADMIN } = require("../utils/constants");
// Router
const router = express.Router();

router.route("/")
    .get(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN),
        AppointmentController.getAllAppointments
    )

router.route("/:id")
    .get(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN, USER),
        AppointmentController.getOneAppointment
    )
    .patch(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN),
        AppointmentValidator.validateUpdateAppointmentPayment,
        AppointmentController.updateAppointmentPayment
    )
    .delete(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN),
        AppointmentController.deleteAppointment 
    )

router.route("/:id/cancel").patch(
    protect, 
    allowedTo(USER),
    AppointmentController.cancelAppointment
)

router.route("/:id/status")
    .patch(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN),
        AppointmentValidator.validateUpdateAppointmentStatus,
        AppointmentController.updateAppointmentStatus
    )

router.route("/:id/payment")
    .post(
        protect, 
        allowedTo(USER),
        AppointmentController.makePayment
    )


router.route("/:id/report")
    .get(
        protect, 
        allowedTo(USER, ADMIN, SUPER_ADMIN),
        AppointmentController.generateReport
    )

    
router.route('/:id/qr').get(protect, allowedTo(USER), AppointmentController.generateQRCode);
router.route('/:id/scan').get(protect, allowedTo(ADMIN, SUPER_ADMIN), AppointmentController.scanAppointment);

router.route("/:doctorId")
    .post(
        protect, 
        allowedTo(USER),
        AppointmentValidator.validateBookAppointment,
        AppointmentController.bookAppointment
    ).get(
        protect, 
        allowedTo(ADMIN, SUPER_ADMIN),
        AppointmentController.getDoctorAppointments
    )



module.exports = router;
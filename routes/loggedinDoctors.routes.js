const express = require("express");

// Constants
const { DOCTOR } = require("../utils/constants");

// Auth middleware
const { protect, allowedTo } = require("../middlewares/auth.middleware");

// Classes
const LoggedInDoctorController = require("../controllers/loggedinDoctor.controller");
const FirebaseController = require("../controllers/firebase.controller");
// Router
const router = express.Router();


router.route("/me").get(protect, allowedTo(DOCTOR), LoggedInDoctorController.getDoctorProfile);

router.route("/update").patch(
    protect,
    allowedTo(DOCTOR),
    FirebaseController.uploadSingleImage("Doctors","profilePicture"),
    LoggedInDoctorController.updateDoctorProfile
);

router.route("/ratings").get(protect, allowedTo(DOCTOR), LoggedInDoctorController.getMyRatings);

router.route("/appointments").get(protect, allowedTo(DOCTOR), LoggedInDoctorController.getMyAppointments);

router.route("/:id").patch(protect, allowedTo(DOCTOR), LoggedInDoctorController.writeDiagnosis);

module.exports = router;

const express = require("express");
// Classes 
const DoctorController = require("../controllers/doctor.controller");
const DoctorValidator = require("../validators/doctor.validator");
const WorkingHoursController = require("../controllers/workingHours.controller");
const WorkingHoursValidator = require("../validators/workingHours.validator");
//middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");
const { ADMIN, SUPER_ADMIN } = require("../utils/constants");
// Router
const router = express.Router();

router.route("/")
    .post(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN), 
        DoctorValidator.validateAddDoctor, 
        DoctorController.addDoctor
    )
    .get(
        DoctorController.getAllDoctors
    )

router.route("/:id")
    .get(
        DoctorController.getOneDoctor
    )
    .post(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN), 
        WorkingHoursValidator.validateAddWorkingHours,
        WorkingHoursController.addWorkingHours
    )
    .patch(
        protect,
        allowedTo(SUPER_ADMIN, ADMIN),
        DoctorValidator.validateUpdateDoctor,
        DoctorController.updateDoctor
    )

router.route("/:id/delete")
    .patch(
        protect,
        allowedTo(SUPER_ADMIN, ADMIN), 
        DoctorController.toggleDeleteDoctor
    )

router.route("/:id/leaves")
    .patch(
        protect,
        allowedTo(SUPER_ADMIN, ADMIN),
        WorkingHoursController.addDoctorLeave
    )

router.route("/:id/leaves-cancel")
    .patch(
        protect,
        allowedTo(SUPER_ADMIN, ADMIN),
        WorkingHoursController.editDoctorLeave
    )

router.route("/:id/available-slots")
    .get(
        protect,
        DoctorController.getAvailableSlots
    )

router.route("/:id/working-hours/:whId")
    .patch(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN), 
        WorkingHoursValidator.validateUpdateWorkingHours, 
        WorkingHoursController.updateWorkingHours
    )
    .delete(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN), 
        WorkingHoursController.deleteWorkingHours
    )

module.exports = router;
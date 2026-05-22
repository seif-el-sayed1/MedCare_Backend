const express = require("express");
// Classes
const AdminController = require("../controllers/admin.controller");
const AdminValidator = require("../validators/admin.validator");
// Middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");
const { ADMIN, SUPER_ADMIN } = require("../utils/constants");
// Router
const router = express.Router();


router.route("/profile")
    .get(
        protect,
        allowedTo(ADMIN, SUPER_ADMIN),
        AdminController.getAdminProfile
    )
    
router.route("/")
    .get(
        protect,
        allowedTo(SUPER_ADMIN),
        AdminController.getAllAdmins
    )
    .post(
        protect,
        allowedTo(SUPER_ADMIN),
        AdminValidator.validateAddAdmin,
        AdminController.addAdmin
    )

router.route("/:id")
    .get(
        protect,
        allowedTo(SUPER_ADMIN),
        AdminController.getOneAdmin
    )
    .patch(
        protect,
        allowedTo(SUPER_ADMIN),
        AdminValidator.validateUpdateAdmin,
        AdminController.updateAdmin
    )
    .delete(
        protect,
        allowedTo(SUPER_ADMIN),
        AdminController.deleteAdmin
    )


module.exports = router;
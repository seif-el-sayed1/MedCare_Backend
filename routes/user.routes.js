const express = require("express");

const { USER, DOCTOR, SUPER_DOCTOR } = require("../utils/constants");

// Middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");

// Classes
const UserController = require("../controllers/user.controller");
const UserValidator = require("../validators/user.validator");
// Router
const router = express.Router();

// User Routes
router
    .route("/me")
    .get(
        protect,
        allowedTo(USER),
        UserController.getMyProfile
    ).patch(
        protect,
        allowedTo(USER),
        UserValidator.validateUpdateUser,
        UserController.updateMyProfile
    )

router
    .route("/lang")
    .patch(
        protect,
        allowedTo(USER),
        UserValidator.validateLanguageUpdate,
        UserController.updateLang
    );

router.route("/me/history")
    .get(
        protect,
        allowedTo(USER),
        UserController.getMyHistory
    )

router.route("/me/waiting-list")
    .get(
        protect,
        allowedTo(USER),
        UserController.getMyWaitingList
    )

router.route("/:id").get(
    protect,
    allowedTo(SUPER_DOCTOR),
    UserController.getOneUser
)

module.exports = router;
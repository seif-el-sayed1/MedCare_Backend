const express = require("express");
// Classes 
const RatingController = require("../controllers/rating.controller");
const RatingValidator = require("../validators/rating.validator");
//middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");
const { USER, ADMIN, SUPER_ADMIN } = require("../utils/constants");
// Router
const router = express.Router();


router.route("/:doctorId").post(
    protect,
    allowedTo(USER),
    RatingValidator.validateCreateRating,
    RatingController.createRating
)

router.route("/:id")
        .patch(
            protect,
            allowedTo(USER),
            RatingValidator.validateUpdateRating,
            RatingController.updateRating
        )
        .delete(
            protect,
            allowedTo(USER),
            RatingController.deleteRating
        )

module.exports = router
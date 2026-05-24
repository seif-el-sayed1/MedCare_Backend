const express = require("express");
// Classes 
const WatingListController = require("../controllers/watingList.controller");
//middlewares
const { protect, allowedTo } = require("../middlewares/auth.middleware");
const { USER, ADMIN, SUPER_ADMIN } = require("../utils/constants");

// Router
const router = express.Router();


router.route("/")
    .post(
        protect, 
        allowedTo(USER),
        WatingListController.addToWaitingList
    ).get(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN),
        WatingListController.getAllWaitingList
    )

router.route("/:id")
    .delete(
        protect, 
        allowedTo(SUPER_ADMIN, ADMIN),
        WatingListController.removeFromWaitingList
    )


module.exports = router


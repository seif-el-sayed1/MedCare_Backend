const express = require("express");
// Class 
const paymentController = require("../controllers/payment.controller");

//Router
const router = express.Router();

router.all("/callback", paymentController.callBack);

module.exports = router;

const Joi = require("joi");
const asyncHandler = require("express-async-handler");
const joiErrorHandler = require("./joiErrorHandler");
const {
  phoneNumberValidator,
} = require("./validatorComponents");
const ApiError = require("../utils/ApiError");
const { PAYMENT_TYPES, APPOINTMENT_STATUS } = require("../utils/constants");


class AppointmentValidator {

    validateBookAppointment = asyncHandler(async (req, res, next) => {
        const schema = Joi.object({
            date: Joi.date().iso().required().messages({
                "any.required": "Date is required",
                "date.iso": "Date must be in ISO format",
            }),
            paymentType: Joi.string().valid(...PAYMENT_TYPES).required().messages({
                "any.required": "Payment type is required",
                "any.only": `Payment type must be one of the following: ${PAYMENT_TYPES.join(", ")}`,
            }),
        })

        joiErrorHandler(schema, req)
        next();
    })

}

module.exports = new AppointmentValidator();
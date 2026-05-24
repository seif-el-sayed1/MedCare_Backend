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

    validateUpdateAppointmentPayment = asyncHandler(async (req, res, next) => {
        const schema = Joi.object({
            paidAmount: Joi.number().min(0).required().messages({
                "any.required": "Paid amount is required",
            }),
        })

        joiErrorHandler(schema, req)
        next();
    })

    validateUpdateAppointmentStatus = asyncHandler(async (req, res, next) => {
        const schema = Joi.object({
            status: Joi.string().valid(...APPOINTMENT_STATUS).required().messages({
                "any.required": "Status is required",
                "any.only": `Status must be one of the following: ${APPOINTMENT_STATUS.join(", ").toLocaleLowerCase()}`,
            }),
        })

        joiErrorHandler(schema, req)
        next();
    })


}

module.exports = new AppointmentValidator();
const Joi = require("joi");
const asyncHandler = require("express-async-handler");
const joiErrorHandler = require("./joiErrorHandler");
const {
  phoneNumberValidator,
} = require("./validatorComponents");
const ApiError = require("../utils/ApiError");
const { translate } = require("../utils/translation");
const {
  checkIfPhoneStartsWithPlus2,
} = require("../middlewares/phoneNumberChecker.middleware");
const { SPECIALIZATION } = require("../utils/constants");


class DoctorValidator {
    
    validateAddDoctor = asyncHandler(async (req, res, next) => {
    
        const schema = Joi.object({
            firstName: Joi.string().min(2).max(32).required().messages({
                "any.required": "First Name is required",
                "string.min": "First Name must be at least 2 characters",
                "string.max": "First Name must be at most 32 characters",
            }),
    
            lastName: Joi.string().min(2).max(32).required().messages({
                "any.required": "Last Name is required",
                "string.min": "Last Name must be at least 2 characters",
                "string.max": "Last Name must be at most 32 characters",
            }),
    
            email: Joi.string().email().required().messages({
                "any.required": "Email is required",
                "string.email": "Invalid Email Address",
            }),
    
            phone: Joi.string().custom(phoneNumberValidator).required().messages({
                "any.required": "Phone number is required",
            }),
    
            specialization: Joi.string().valid(...SPECIALIZATION).required().messages({
                "any.required": "Specialization is required",
                "any.only": `Specialization must be one of: ${SPECIALIZATION.join(", ")}`,
            }),
    
            consultationPrice: Joi.number().min(0).required().messages({
                "any.required": "Consultation Price is required",
            }),

            workingHours: Joi.array().items(
                Joi.object({
                    // 0 = Sunday || 1 = Monday || 2 = Tuesday || 3 = Wednesday || 4 = Thursday || 5 = Friday || 6 = Saturday
                    dayOfWeek: Joi.number().min(0).max(6).required().messages({
                        "any.required": "Day of week is required",
                        "number.min": "Day must be between 0 and 6",
                        "number.max": "Day must be between 0 and 6",
                    }),
                    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
                        "any.required": "Start time is required",
                        "string.pattern.base": "Start time must be in HH:MM format",
                    }),
                    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
                        "any.required": "End time is required",
                        "string.pattern.base": "End time must be in HH:MM format",
                    }),
                    slotDuration: Joi.number().min(10).max(120).optional()
                })
            ).min(1).required().messages({
                "any.required": "Working hours are required",
                "array.min": "At least one working day is required"
            }),
    
            bio: Joi.string().max(1000).optional(),
    
            experienceYears: Joi.number().required()
        });
        
        joiErrorHandler(schema, req);
        checkIfPhoneStartsWithPlus2(req);
        
        // Check duplicate days in body
        const days = req.body.workingHours.map(item => item.dayOfWeek);

        const hasDuplicates = days.length !== new Set(days).size;

        if (hasDuplicates) {
            return next(new ApiError("Duplicate days are not allowed", 400));
        }

        next();
    });

}

module.exports = new DoctorValidator();
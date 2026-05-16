const Joi = require("joi");
const asyncHandler = require("express-async-handler");
const joiErrorHandler = require("./joiErrorHandler");
const prisma = require("../startup/db");
const ApiError = require("../utils/ApiError");

class WorkingHoursValidator {

    validateAddWorkingHours = asyncHandler(async (req, res, next) => {
        const schema = Joi.object({
            workingHours: Joi.array().items(
                Joi.object({
                    // 0 = Sunday || 1 = Monday || 2 = Tuesday || 3 = Wednesday || 4 = Thursday || 5 = Friday || 6 = Saturday
                    dayOfWeek: Joi.number()
                        .min(0)
                        .max(6)
                        .required()
                        .messages({
                            "any.required": "Day of week is required",
                            "number.min": "Day must be between 0 and 6",
                            "number.max": "Day must be between 0 and 6",
                        }),

                    startTime: Joi.string()
                        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
                        .required()
                        .messages({
                            "any.required": "Start time is required",
                            "string.pattern.base": "Start time must be in HH:MM format",
                        }),

                    endTime: Joi.string()
                        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
                        .required()
                        .messages({
                            "any.required": "End time is required",
                            "string.pattern.base": "End time must be in HH:MM format",
                        }),

                    slotDuration: Joi.number()
                        .min(10)
                        .max(120)
                        .optional()
                })

            )
            .min(1)
            .required()
            .messages({
                "any.required": "Working hours are required",
                "array.min": "At least one working day is required"
            }),
        });

        joiErrorHandler(schema, req);

        // Check duplicate days in body
        const days = req.body.workingHours.map(item => item.dayOfWeek);

        const hasDuplicates = days.length !== new Set(days).size;

        if (hasDuplicates) {
            return next(new ApiError("Duplicate days are not allowed", 400));
        }

        // Check existing days in database
        const existingWorkingHours = await prisma.workingHours.findMany({
            where: {
                doctorId: req.params.id,
                dayOfWeek: {
                    in: days
                }
            }
        });

        if (existingWorkingHours.length > 0) {

            const existingDays = existingWorkingHours.map(
                item => item.dayOfWeek
            );

            return next(
                new ApiError(
                    `These days already exist`,
                    400
                )
            );
        }

        next();
    });

}

module.exports = new WorkingHoursValidator();
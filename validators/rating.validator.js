const Joi = require("joi");
const asyncHandler = require("express-async-handler");
const joiErrorHandler = require("./joiErrorHandler");
const ApiError = require("../utils/ApiError");

class RatingValidator {
    
    validateCreateRating = asyncHandler(async (req, res, next) => {
        req.body.userId = req.user.id
        req.body.doctorId = req.params.doctorId

        const schema = Joi.object({
            userId: Joi.string().uuid().required(),
            doctorId: Joi.string().uuid().required(),
            rating: Joi.number().min(1).max(5).required(),
            review: Joi.string().max(500).optional(),
        })
        
        joiErrorHandler(schema, req)
        next();
    })

    validateUpdateRating = asyncHandler(async (req, res, next) => {
        const schema = Joi.object({
        review: Joi.string().optional(),
        rating: Joi.number().min(1).max(5).optional()
        });
        joiErrorHandler(schema, req);

        next();
    });
}

module.exports = new RatingValidator()
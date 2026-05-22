const Joi = require("joi");
const asyncHandler = require("express-async-handler");
const joiErrorHandler = require("./joiErrorHandler");

class AdminValidator {
  static validateAddAdmin = asyncHandler(async (req, res, next) => {
    const schema = Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
    });
    joiErrorHandler(schema, req);
    next();
  });

  static validateUpdateAdmin = asyncHandler(async (req, res, next) => {
    const schema = Joi.object({
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      phone: Joi.string().custom(phoneNumberValidator).optional().messages({
        "string.pattern.base": "Phone number must start with '0' and contain exactly 11 digits",
        "any.required": "Phone number is required"
      }),
    });
    joiErrorHandler(schema, req);
    next();
  });
}

module.exports = AdminValidator;

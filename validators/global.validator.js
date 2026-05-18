const Joi = require("joi");
const asyncHandler = require("express-async-handler");
const joiErrorHandler = require("./joiErrorHandler");
const { LOGIN_TYPE, LANGS } = require("../utils/constants");
const ApiError = require("../utils/ApiError");
const { translate } = require("../utils/translation");
const { checkIfPhoneStartsWithPlus2 } = require("../middlewares/phoneNumberChecker.middleware");
const { phoneNumberValidator } = require("./validatorComponents");

class GlobalValidator {
  validateLogin = asyncHandler(async (req, res, next) => {
    const schema = Joi.object({
      email: Joi.string().email().required(), 
      loginType: Joi.string()
        .valid(...LOGIN_TYPE)
        .optional(),
      password: Joi.when("loginType", {
        is: Joi.string().valid(...LOGIN_TYPE),
        then: Joi.string().optional().allow(""),
        otherwise: Joi.string().min(8).required()
      }).messages({
        "string.min": "Password must be at least 8 characters long",
        "any.required": "Password is required"
      }),
      notificationToken: Joi.string().optional()
    }).messages({
      "any.required": "Email is required",
      "string.email": "Invalid Email Address"
    });

    joiErrorHandler(schema, req);
    next();
  });

}

module.exports = new GlobalValidator();

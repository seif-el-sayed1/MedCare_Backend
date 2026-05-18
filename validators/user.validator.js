const Joi = require("joi");
const asyncHandler = require("express-async-handler");
const joiErrorHandler = require("./joiErrorHandler");
const prisma = require("../startup/db");
const {
  phoneNumberValidator,
} = require("./validatorComponents");
const ApiError = require("../utils/ApiError");
const { translate } = require("../utils/translation");
const {
  GENDER,
  LOGIN_TYPE,
  LANGS,
} = require("../utils/constants");
const {
  checkIfPhoneStartsWithPlus2,
} = require("../middlewares/phoneNumberChecker.middleware");

/**
 * UserValidator class for validating user registration requests.
 *
 * This class contains methods for validating user data during the registration process using Joi and additional checks.
 */
class UserValidator {
  validateRegisterUser = asyncHandler(async (req, res, next) => {
    const schema = Joi.object({
      firstName: Joi.string()
        .when("loginType", {
          is: Joi.valid(...LOGIN_TYPE),
          then: Joi.optional().allow(""),
          otherwise: Joi.required(),
        })
        .min(2)
        .max(32)
        .messages({ "any.required": "First Name is required" }),

      lastName: Joi.string()
        .when("loginType", {
          is: Joi.valid(...LOGIN_TYPE),
          then: Joi.optional().allow(""),
          otherwise: Joi.required(),
        })
        .min(2)
        .max(32)
        .messages({ "any.required": "Last Name is required" }),

      email: Joi.string().email().required().messages({
        "any.required": "Email is required",
        "string.email": "Invalid Email Address",
      }),

      phone: Joi.string().custom(phoneNumberValidator).required().messages({
        "any.required": "Phone is required",
        "string.pattern.base": "Invalid Phone Number",
      }),

      age: Joi.number().required().messages({
        "any.required": "Age is required",
      }),

      profilePicture: Joi.string().optional(),

      gender: Joi.string()
        .valid(...GENDER)
        .required()
        .messages({ "any.required": "Gender is required" }),


      loginType: Joi.string().optional(),

      password: Joi.string()
        .min(6)
        .when("loginType", { is: Joi.exist(), then: Joi.optional() })
        .messages({
          "string.min": "Password must be at least 6 characters",
          "any.required": "Password is required",
        }),

      confirmPassword: Joi.string()
        .valid(Joi.ref("password"))
        .when("loginType", { is: Joi.exist(), then: Joi.optional() })
        .messages({
          "any.required": "Confirm Password is required",
          "any.only": "Passwords do not match",
        }),

      notificationToken: Joi.string().optional(),
    });

    joiErrorHandler(schema, req);
    checkIfPhoneStartsWithPlus2(req);
    next();
  });

  validateUpdateUser = asyncHandler(async (req, res, next) => {
    const schema = Joi.object({
      firstName: Joi.string().optional().min(2).max(32),
      lastName: Joi.string().optional().min(2).max(32),
      profilePicture: Joi.string().optional(),
      age: Joi.number().optional(),
      phone: Joi.string().custom(phoneNumberValidator).optional().messages({
        "string.pattern.base":
          "Phone number must start with '0' and contain exactly 11 digits",
        "any.required": "Phone number is required",
      }),
      email: Joi.string().email().optional(),
    });

    joiErrorHandler(schema, req);
    checkIfPhoneStartsWithPlus2(req);

    if (
      req.body.email &&
      req.body.email !== req.user.email
    ) {
      const user = await prisma.user.findFirst({
        where: {
          email: req.body.email,
          isVerified: true,
        },
      });

      if (user) {
        return next(
          new ApiError(
            translate("Duplicated Email", req.headers.lang),
            400
          )
        );
      }
    }

    next();
  });

  validateLanguageUpdate = asyncHandler(async (req, res, next) => {
    const schema = Joi.object({
      lang: Joi.string()
        .required()
        .valid(...LANGS),
    });
    joiErrorHandler(schema, req);
    next();
  });
}

module.exports = new UserValidator();

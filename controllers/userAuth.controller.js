const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const prisma = require("../startup/db");
const Auth = require("../utils/auth");
const ApiError = require("../utils/ApiError");
const { translate } = require("../utils/translation");
const { generateCode, hashCode } = require("../utils/generateCode");
// Controller classes
const { userVerificationEmail } = require("./email.controller");
const EmailController = require("./email.controller");

class UserController {
  #getUsersData = (user, lang = "en") => {
    return {
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profilePicture: user.profilePicture,
      email: user.email,
      phone: user.phone,
      age: user.age,
      gender: user.gender,
      createdAt: user.createdAt,
      loginType: user.loginType,
    };
  };

  login = (user, loginType) =>
    asyncHandler(async (req, res, next) => {
      const { password, email } = req.body;
      const lang = req.headers.lang || "en";


      if (loginType && loginType !== user.loginType)
        return next(new ApiError(translate("Incorrect Email or password", lang), 403));
      else if (!loginType) {
        if (!(await Auth.comparePassword(user, password)))
          return next(new ApiError(translate("Incorrect Email or password", lang), 403));
      }

      // Response Msg
      let message = `Welcome back ${user.firstName || ""}!`;

      // Check if user account is deactivated
      if (!user.isActive) {
        const targetDate = new Date(user.deactivatedAt);
        const currentDate = new Date();
        const timeDifference = currentDate - targetDate;
        const millisecondsIn15Days = 15 * 24 * 60 * 60 * 1000;

        if (timeDifference >= millisecondsIn15Days) {
          return next(new ApiError(translate("Incorrect Email or password", lang), 404));
        } else {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              deactivatedAt: null,
              isActive: true
            }
          });
          message = "Welcome back! Your account has been reactivated.";
        }
      }

      // Check if account is verified
      if (!user.isVerified) {
        const { code, hashedCode } = await generateCode();
        const verifiedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationCode: hashedCode,
            verificationCodeExp: new Date(Date.now() + 10 * 60 * 1000)
          },
        });

        if (user.email) {
          await userVerificationEmail(code, user.email);

          return res.status(200).json({
            success: true,
            message: "Verification OTP is sent to your Email",
            data: {
              ...this.#getUsersData(user, lang)
            }
          });
        }
      }


      if (user.isBlocked)
        return next(
          new ApiError(
            translate("Your account is blocked, please contact the support team", lang),
            403
          )
        );

      // generate token
      const token = await Auth.generateToken(user.id, user.role);

      // Save notification token
      if (req.body.notificationToken) {
        await prisma.user.update({
          where: { id: user.id },
          data: { notificationToken: req.body.notificationToken }
        });
      }

      // Remove password from the response
      user.password = undefined;
      user.isVerified = undefined;
      user.isActive = undefined;

      // response
      res.status(200).json({
        success: true,
        message,
        data: {
          ...this.#getUsersData(user, lang),
          ...token
        }
      });
    });


  // @desc    Log In
  // @route   POST /user/auth/login
  // @access  Public
  userLogin = asyncHandler(async (req, res, next) => {
    const { email, password, loginType, phone } = req.body;
    const lang = req.headers.lang || "en";

    const user = await prisma.user.findFirst({
      where: phone ? { phone } : { email }
    });

    if (loginType) {
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "Please, Complete your profile!",
          signUpForFirstTime: true
        });
      }

      return this.login(user, loginType)(req, res, next);
    }

    if (!user) {
      return next(new ApiError(translate("Incorrect Email or password", lang), 403));
    }

    return this.login(user, loginType)(req, res, next);
  });

}

module.exports = new UserController();

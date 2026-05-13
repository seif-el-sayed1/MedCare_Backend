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

  // @desc    Sign Up
  // @route   POST /user/auth/register
  // @access  Public
  userRegister = async (req, res, next) => {
    try {

      console.log(" 🚀~ Req.body ~ in User register", req.body);

      const { code, hashedCode } = await generateCode();

      // create user
      const user = await prisma.user.create({
        data: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          gender: req.body.gender,
          email: req.body.email,
          phone: req.body.phone,
          age: req.body.age,
          profilePicture: req.body.image || req.body.profilePicture,
          loginType: req.body.loginType,
          notificationToken: req.body.notificationToken,
          password: await Auth.hashPassword(req.body.password),
          verificationCode: hashedCode,
          verificationCodeExp: new Date(Date.now() + 10 * 60 * 1000)
        }
      })

      const { email, loginType } = req.body;

      // For non-email login types, mark as verified immediately
      if (loginType && loginType !== "email") {

        const verifiedUser = await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            isVerified: true
          }
        });
        const token = await Auth.generateToken(verifiedUser.id, verifiedUser.role);

        res.status(200).json({
          success: true,
          message: "Account Created and verified successfully",
          data: {
            ...this.#getUsersData(verifiedUser, req.headers.lang),
            ...token
          }
        });
      } else if (email) {
        // Send verification email only
        await userVerificationEmail(code, email);

        res.status(200).json({
          success: true,
          message: "Verification OTP is sent to your Email",
          data: {
            ...this.#getUsersData(user, req.headers.lang)
          }
        });
      }
    } catch (err) {
      next(err);
    }
  };

  // @desc    User account verification
  // @route   POST /user/auth/verifyAccount
  // @access  Public
  userVerifyAccount = asyncHandler(async (req, res, next) => {
    const lang = req.headers.lang || "en";

    if (!req.body.code)
      return next(new ApiError(translate("Verification OTP is required", lang), 400));

    const hashedCode = crypto.createHash("sha256").update(req.body.code).digest("hex");

    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user || (!user.verificationCode && !user.verificationCodeExp))
      return next(new ApiError(translate("Invalid request", lang), 400));

    if (Date.now() >= Date.parse(user.verificationCodeExp))
      return next(new ApiError(translate("Verification OTP is expired", lang), 401));

    if (user.verificationCode !== hashedCode)
      return next(new ApiError(translate("Invalid Verification OTP", lang), 401));

    const updatedUser = await prisma.user.update({
      where: { email: req.body.email },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationCodeExp: null,
        notificationToken: req.body.notificationToken
      },
    });

    const token = await Auth.generateToken(updatedUser.id, updatedUser.role);

    res.status(200).json({
      success: true,
      message: "Account verified successfully",
      data: {
        ...this.#getUsersData(updatedUser, lang),
        ...token
      }
    });
  });


  // // @desc    Update logged user password
  // // @route   PATCH /user/auth/updatePassword
  // // @access  Private
  updateLoggedUserPassword = asyncHandler(async (req, res, next) => {
    const lang = req.headers.lang || "en";

    if (!(await Auth.comparePassword(req.user, req.body.currentPassword)))
      return next(new ApiError(translate("Incorrect password", lang), 401));

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: await Auth.hashPassword(req.body.newPassword),
        passwordChangedAt: new Date()
      }
    });

    if (!user) return next(new ApiError("User not found", 404));

    res.status(200).json({
      success: true,
      message: "Password updated successfully, please login again"
    });
  });

  //@desc  Verify OTP
  //@route POST /user/auth/verify-otp
  //@access Private
  verifyOtp = asyncHandler(async (req, res, next) => {
    const lang = req.headers.lang || "en";

    const hashedCode = hashCode(req.body.otp);
    const user = await prisma.user.findFirst(
      {
        where: {
          verificationCode: hashedCode,
          verificationCodeExp: { gt: new Date() }
        }
      }
    );

    if (!user)
      return next(new ApiError(translate("OTP isn't found!", lang), 403));

    let token = { token: user.token, tokenExpDate: user.tokenExpDate };

    if (!token.token) token = await Auth.generateToken(user.id, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationCodeExp: null,
        phone: user.phone || undefined,
        email: user.email || undefined,
      }
    });

    res.status(200).json({
      success: true,
      message: "Account verified successfully",
      data: {
        ...this.#getUsersData(user, lang),
        ...token
      }
    });
  });

}

module.exports = new UserController();

const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const prisma = require("../startup/db");
const ApiError = require("../utils/ApiError");
const { translate } = require("../utils/translation");

// Constants
const { DOCTOR, USER, ROLES, ADMIN, SUPER_DOCTOR } = require("../utils/constants");

// === Check user authentication and authorization function ===
const checkUser = async (model, token, decoded, next) => {
  // Check user
  const prismaQuery = prisma[model].findUnique({where: 
    {
      id: decoded.userId
    }
  });

  const currentUser = await prismaQuery;
  if (!currentUser) return next(new ApiError(`${model} ${translate("not found", decoded.lang)}`, 401));
  // Check if token is valid
  if (currentUser.token !== token)
    return next(new ApiError(translate("Session expired, please login again...", decoded.lang), 401));
  // Check if the account is deactivated
  if (currentUser.isActive === false)
    return next(new ApiError(`This ${model} ${translate("account is deactivated", decoded.lang)}`, 401));
  // Check if the account is blocked
  if (currentUser.isBlocked)
    return next(new ApiError(translate("Your account is blocked, please contact the support team", decoded.lang), 401));
  // Check if user changed his password after token was created
  if (currentUser.passwordChangedAt) {
    const passwordChangedAtTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
    if (passwordChangedAtTimestamp > decoded.iat) {
      return next(new ApiError(translate("Password recently changed, please login again...", decoded.lang), 401));
    }
  }
  return currentUser;
};

// === Check token => verify => Check role is valid => check expiration => check based on role ===
exports.protect = asyncHandler(async (req, res, next) => {
  // check token
  let token;
  if (req.headers.authorization) token = req.headers.authorization;
  if (!token)
    return next(new ApiError(translate("Invalid token, please login again...", req.headers.lang), 401));

  // verify token
  const decoded = await jwt.verify(token, process.env.JWT_SECRET);

  // Check token role
  const role = decoded.role;
  console.log("ROLE", role);
  if (!ROLES.includes(role))
    return next(new ApiError(translate("Invalid token role, please login again...", req.headers.lang), 401));

  // Check token expiration
  const currentTimestamp = Math.floor(Date.now() / 1000); // in seconds
  if (decoded.exp < currentTimestamp)
    return next(new ApiError(translate("Token has expired, please login again...", req.headers.lang), 401));

  // Lang is added to decoded object
  let lang = "en";
  switch (req.headers.lang?.toLowerCase()) {
    case "ar":
      lang = "ar";
      break;
    case "all":
      lang = "all";
      break;
    default:
      break;
  }
  decoded.lang = lang;

  // Check authentication and authorization
  let currentUser;
  switch (role) {
    case ADMIN:
      currentUser = await checkUser("admin", token, decoded, next);
      req.role = ADMIN;
      req.userId = decoded.userId;
      break;
    case USER:
      currentUser = await checkUser("user", token, decoded, next);
      req.role = USER;
      req.userId = decoded.userId;
      break;
  }
  req.user = currentUser;
  next();
});


// === Check for user permission based on role ===
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!roles.includes(req.role))
      return next(new ApiError(translate("Not allowed to access this route", req.headers.lang), 403));
    next();
  });
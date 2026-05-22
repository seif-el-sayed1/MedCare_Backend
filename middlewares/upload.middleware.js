const multer = require("multer");
const ApiError = require("../utils/ApiError");
const multerStorage = multer.memoryStorage();

//multer will only accepts image
//using mimetype image/imageExtension
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image") ||
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/octet-stream"
  )
    cb(null, true);
  else cb(new ApiError("Not an image, please upload only Image", 400), false);
};

const multerFilterForPDF = (req, file, cb) => {
  if (file.mimetype === "application/pdf" || file.mimetype === "application/octet-stream")
    cb(null, true); // Accept the file
  else cb(new ApiError("Not a PDF, please upload only PDFs", 400), false);
};

const filesConfiguration = multer({
  storage: multerStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Set the limit to 10MB
});

const uploadAnyFile = filesConfiguration. fields([
  { name: "profilePicture", maxCount: 1 },
]);

module.exports = uploadAnyFile;
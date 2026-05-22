const dotenv = require("dotenv");
dotenv.config();

const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const asyncHandler = require("express-async-handler");
const { storage } = require("../startup/firebase");

const { ref, getDownloadURL, uploadBytesResumable, deleteObject } = require("firebase/storage");
const ApiError = require("../utils/ApiError");

let folderName;

/**
 * Uploads the given image to Firebase Storage and returns the download URL
 * of the uploaded image
 * @param {Buffer} image The image to be uploaded
 * @returns {Promise<string>} The download URL of the uploaded image
 */
const uploadImageAndGetUrl = async (image) => {
  // Downgrade image quality
  const processedImageBuffer = await sharp(image.buffer)
    .toFormat("jpeg")
    .jpeg({ quality: 70 })
    .toBuffer();
  // Upload image
  const storageRef = ref(
    storage,
    `${folderName}/${`image-${uuidv4()}-${Date.now()}-${folderName.toLowerCase()}.jpeg`}`
  );
  const metadata = { contentType: "image/jpeg" };
  // Add image download URL to request body
  const snapshot = await uploadBytesResumable(storageRef, processedImageBuffer, metadata);
  return await getDownloadURL(snapshot.ref);
};

// Upload any buffer (image/file) preserving mimetype and extension
const uploadBufferAndGetUrl = async (file, prefix = "file") => {
  const ext = (file.originalname || "").split(".").pop() || "bin";
  const storageRef = ref(
    storage,
    `${folderName}/${`${prefix}-${uuidv4()}-${Date.now()}-${folderName?.toLowerCase?.()}.${ext}`}`
  );
  const metadata = { contentType: file.mimetype || "application/octet-stream" };
  const snapshot = await uploadBytesResumable(storageRef, file.buffer, metadata);
  return await getDownloadURL(snapshot.ref);
};

/**
 * Uploads the given document to Firebase Storage and returns the download URL
 * of the uploaded document
 *
 * @param {Buffer} document The document to be uploaded
 * @param {string} baseName The base name of the document
 * @param {string} innerName The inner name of the document
 * @returns {Promise<string>} The download URL of the uploaded document
 */
const uploadDocumentAndGetUrl = async (document, baseName, innerName) => {
  // Upload Document
  const storageRef = ref(
    storage,
    `${folderName}/${`document(${baseName},${innerName})-${uuidv4()}-${Date.now()}-${folderName.toLowerCase()}.pdf`}`
  );
  const metadata = { contentType: "application/pdf" };
  // Add image download URL to request body
  const snapshot = await uploadBytesResumable(storageRef, document.buffer, metadata);
  return await getDownloadURL(snapshot.ref);
};

/**
 * Deletes an image from Firebase Storage using its URL.
 *
 * @param {string} fileUrl - The URL of the image to be deleted.
 * @param {string} folderName - The name of the folder where the image is stored.
 * @returns {Promise<boolean>} - Returns true if the image is successfully deleted, otherwise false.
 */

const deleteImageByUrl = async (fileUrl, folderName) => {
  try {
    folderName = folderName;
    const fullPath = new URL(fileUrl).pathname;
    const startIndex = fullPath?.indexOf("image-");
    const fileName = fullPath.substring(startIndex);
    const storageRef = ref(storage, `${folderName}/${fileName}`);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.log("🚀 ~ deleteImageByUrl ~ error:", error);
    return false;
  }
};
/**
 * Deletes a document from Firebase Storage using its URL.
 *
 * @param {string} fileUrl - The URL of the document to be deleted.
 * @param {string} folderName - The name of the folder where the document is stored.
 * @returns {Promise<boolean>} - Returns true if the document is successfully deleted, otherwise false.
 */
const deleteDocumentUrl = async (fileUrl, folderName) => {
  try {
    folderName = folderName;
    const fullPath = new URL(fileUrl).pathname;
    console.log("🚀 ~ deleteDocumentUrl ~ fullPath:", fullPath);
    const startIndex = fullPath?.indexOf("document");
    const fileName = fullPath.substring(startIndex);
    // console.log("🚀 ~ deleteDocumentUrl ~ fileName:", fileName);
    const storageRef = ref(storage, `${folderName}/${fileName}`);
    console.log(`🚀 ~ deleteDocumentUrl ~ {folderName}/{fileName}: ${folderName}/${fileName}`);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.log("error");
    return false;
  }
};

class FirebaseImageController {
  uploadMultipleImagesForTheUser = (modelName) =>
    asyncHandler(async (req, res, next) => {
      // console.log("🚀 ~ Req.body ~ in upload Multiple Images in firebase", req.files);
      folderName = `${modelName}`;
      const { files } = req;
      const { photos } = req.body;
      // console.log(files);
      if (!files) return next();
      else {
        // console.log(photos);
        if (files.length > 0) {
          let photosWithCaptions = [];
          for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if (file.fieldname.includes("photos")) {
              let url = await uploadImageAndGetUrl(file);
              photosWithCaptions.push({
                url,
                caption: photos ? photos[i]?.caption : undefined
              });
            } else if (file.fieldname === "profilePicture") {
              req.body.profilePicture = await uploadImageAndGetUrl(file);
            } else if (file.fieldname === "nationalId") {
              let extName = file.originalname.split(".")[1]; // extract extension name of the file
              let validPdf = file.mimetype.includes("pdf"); // get the file mimeType
              // Check on mimeType and file extension
              if (extName.toLowerCase() !== "pdf")
                return next(new ApiError("Invalid File Format or Not a Valid PDF", 400));
              req.body.nationalId = await uploadDocumentAndGetUrl(
                file,
                req.user.firstName || req.user.entityName,
                req.user.lastName || req.user.ownerName
              );
            }
          }
          if (photosWithCaptions.length > 0) req.body.photos = photosWithCaptions;
        }
      }
      next();
    });

  uploadMultipleImages = (modelName) =>
    asyncHandler(async (req, res, next) => {
      folderName = modelName;
      const { files } = req;
      if (!files) return next();
      for (const key of Object.keys(files)) {
        let file = files[key];
        let photosPromise = [];
        if (file.length > 0) {
          for (let i = 0; i < file.length; i++) {
            let file = files[key][i];
            if (file.fieldname?.toLowerCase()?.includes("images")) {
              photosPromise.push(uploadImageAndGetUrl(file));
            }
          }
          req.body[key] = await Promise.all(photosPromise);
        }
      }
      next();
    });

  uploadSingleImage = (modelName, fieldName) =>
    asyncHandler(async (req, res, next) => {
      folderName = modelName;

      const file =
        req.file ||                        
        req.files?.[fieldName]?.[0];       

      if (!file) return next();

      req.body[fieldName] = await uploadImageAndGetUrl(file);
      next();
    });

  uploadFile = (modelName) =>
    asyncHandler(async (req, res, next) => {
      folderName = modelName;
      const file = req.file;
      if (!file) return next(); // if image is not sent then skip this middleware (user image is optional)
      req.body.document = await uploadDocumentAndGetUrl(
        file,
        req.body.entityName,
        req.body.ownerName
      );
      next();
      return;
    });

  /**
   *
   * Deletes Image By URL And folderName
   * @param {String} image a url link to be deleted
   * @param {String} folderName the folder where the image is saved on firebase
   * @returns true or false
   */
  deleteOldImage = async (image, folderName) => await deleteImageByUrl(image, folderName);

  /**
   *
   * Deletes Document By URL And folderName
   * @param {String} document a url link to be deleted
   * @param {String} folderName the folder where the image is saved on firebase
   * @returns true or false
   */
  deleteOldDocument = async (document, folderName) => await deleteDocumentUrl(document, folderName);

  rollbackNewUserImage = asyncHandler(
    async (req, res, next) => await deleteImageByUrl(req.body.image)
  );

  // Notifications
  addNotificationImage = asyncHandler(async (req, res, next) => {
    folderName = "Notification";
    if (req.files && req.files.notificationImage) {
      req.body.image = await uploadImageAndGetUrl(req.files.notificationImage[0]);
    }
    next();
  });

  deleteOldNotificationImage = asyncHandler(
    async (req) => await deleteImageByUrl(req.oldImage, "Notification")
  );

  rollbackNotificationImage = asyncHandler(
    async (req) => await deleteImageByUrl(req.body.image, "Notification")
  );

  // Chat media
  uploadMultipleImagesForTheChat = (modelName) =>
    asyncHandler(async (req, res, next) => {
      folderName = `${modelName}`;
      const { files } = req;
      if (!files) return next(new ApiError("Media file is required", 404));
      if (files.length > 0) {
        let urls = [];
        for (let i = 0; i < files.length; i++) {
          let file = files[i];
          urls.push(uploadImageAndGetUrl(file));
        }
        req.body.media = await Promise.all(urls);
      }
      next();
    });

  rollbackChatImages = asyncHandler(async (req) => {
    const { media } = req.body;
    if (media && media.length > 0) {
      let promises = [];
      for (let image of media) {
        promises.push(deleteImageByUrl(image, folderName));
      }
      await Promise.all(promises);
    }
  });
}
module.exports = new FirebaseImageController();

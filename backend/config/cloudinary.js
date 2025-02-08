// config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storageProfile = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    format: async () => "png",
    public_id: (req, file) => `user_${Date.now()}`,
  },
});

const storageBooks = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "book_images",
    format: async () => "png",
    public_id: (req, file) => `book_${Date.now()}`,
  },
});

const uploadProfile = multer({ storage: storageProfile });
const uploadBooks = multer({ storage: storageBooks });

module.exports = { uploadProfile, uploadBooks, cloudinary };

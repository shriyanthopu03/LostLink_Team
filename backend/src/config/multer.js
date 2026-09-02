import multer from "multer";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxFileSize = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!file) {
    return cb(new Error("No file uploaded"));
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP, and GIF images are allowed"));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: 1
  },
  fileFilter
});

export default upload;

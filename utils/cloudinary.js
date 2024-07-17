const cloudinary = require("cloudinary").v2;
const uploadBufferToCloudinary = async (byteArrayBuffer) => {
  const uploadResult = await new Promise((resolve) => {
    cloudinary.uploader
      .upload_stream((error, uploadResult) => {
        return resolve(uploadResult);
      })
      .end(byteArrayBuffer);
  });
  return uploadResult;
};

module.exports = {
  uploadBufferToCloudinary,
};

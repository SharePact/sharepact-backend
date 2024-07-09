const cloudinary = require('../config/cloudinary');

const uploadFileToStorage = async (fileBuffer, fileName, mimeType) => {
  try {
    const result = await cloudinary.uploader.upload(`data:${mimeType};base64,${fileBuffer.toString('base64')}`, {
      public_id: `logos/${fileName}`,
      folder: 'logos'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

module.exports = uploadFileToStorage;

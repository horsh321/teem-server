import { v2 as cloudinary } from "cloudinary";
import env from "../utils/validateEnv.js";

export const uploadMultiImages = async (images) => {
  try {
    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        const result = await cloudinary.uploader.upload(image, {
          upload_preset: env.CLOUDINARY_UPLOAD_PRESET,
        });
        return result.secure_url;
      })
    );
    return uploadedImages;
  } catch (error) {
    console.log(error);
  }
};

export const uploadSingleImage = async (image) => {
  try {
    const result = await cloudinary.uploader.upload(image, {
      upload_preset: env.CLOUDINARY_UPLOAD_PRESET,
    });
    return result.secure_url;
  } catch (error) {
    console.log(error);
  }
};

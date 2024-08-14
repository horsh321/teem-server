import { cleanEnv } from "envalid";
import { str, port } from "envalid/dist/validators.js";

export default cleanEnv(process.env, {
  MONGO_URI: str(),
  PORT: port(),
  JWT_ACCESS_TOKEN: str(),
  JWT_ACCESS_TOKEN_EXPIRY: str(),
  JWT_REFRESH_TOKEN: str(),
  JWT_REFRESH_TOKEN_EXPIRY: str(),
  BREVO_MAIL_HOST: str(),
  BREVO_MAIL_PORT: str(),
  BREVO_MAIL_LOGIN: str(),
  BREVO_MAIL_APIKEY: str(),
  BASE_URL_CLIENT: str(),
  BASE_URL_SELLER: str(),
  CLOUDINARY_NAME: str(),
  CLOUDINARY_APIKEY: str(),
  CLOUDINARY_SECRETKEY: str(),
  CLOUDINARY_UPLOAD_PRESET: str(),
});

import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";
import crypto from "crypto";
import User from "../models/user.js";
import Token from "../models/token.js";
import LoginCode from "../models/loginCode.js";
import {
  generateToken,
  generateRefreshToken,
} from "../config/generateTokens.js";
import env from "../utils/validateEnv.js";
import sendEmail from "../config/sendMail.js";
import { uploadSingleImage } from "../config/cloudinaryUpload.js";
import generateRandomNumber from "../utils/generateMerchantCode.js";
import Merchant from "../models/merchant.js";

//create randomToken
const createRandomToken = async (userId, token) => {
  const createToken = new Token(userId, token);
  return createToken.save();
};

export const signUp = async (req, res, next) => {
  const { email, username, password } = req.body;
  const requestOrigin = req.get("Origin"); // Get the request origin
  try {
    if (!email || !username || !password) {
      return next(createHttpError(400, "Form fields are missing"));
    }
    //check if username already exists
    const existingUsername = await User.findOne({ username: username });
    if (existingUsername) {
      return next(
        createHttpError(409, "Username already exists!, choose another")
      );
    }
    //check existing email
    const existingEmail = await User.findOne({ email: email });
    if (existingEmail) {
      return next(
        createHttpError(409, "Email already exists!, choose another")
      );
    }
    //encrypt password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    //create user
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });
    //sign user using jwt
    const accessToken = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    //save refreshtoken to user details in database
    user.refreshToken = refreshToken;
    //save user doc
    await user.save();
    //send user welcome mail
    const sendUserMail = await sendEmail({
      username: username,
      from: env.BREVO_MAIL_LOGIN,
      to: user.email,
      subject: "New user registration",
      text: "Welcome to Footsy! We're very excited to have you on board.",
    });
    //send response to frontend
    return res.status(201).json({
      sendUserMail,
      accessToken,
      msg: "Registration successfull",
    });
  } catch (error) {
    next(error);
  }
};

export const loginViaEmail = async (req, res, next) => {
  const { email } = req.body;
  const requestOrigin = req.get("Origin");
  try {
    if (!email) {
      return next(createHttpError(400, "Email field is missing"));
    }
    const user = await User.findOne({ email });
    if (!user) {
      return next(createHttpError(404, "User email not found"));
    }
    const createLoginToken = await LoginCode.create({
      userId: user.id,
      code: generateRandomNumber(),
    });
    await createLoginToken.save();
    const loginLink = `${
      requestOrigin === env.BASE_URL_SELLER
        ? env.BASE_URL_SELLER
        : env.BASE_URL_CLIENT
    }/authorize/${user.id}/${createLoginToken.code}`;
    const sendLoginMail = await sendEmail({
      username: user.username,
      from: env.BREVO_MAIL_LOGIN,
      to: user.email,
      subject: "Your login code",
      text: `Click ${loginLink} to sign in. Expires in 5 minutes`,
      btnText: "Quick Login",
      link: loginLink,
    });
    if (!sendLoginMail.success) {
      return next(
        createHttpError(
          500,
          "Unable to send Login link to your email, pls try again."
        )
      );
    } else {
      res.status(200).json({ msg: "Login link sent to your email" });
    }
  } catch (error) {
    next(error);
  }
};

export const verifyLoginLink = async (req, res, next) => {
  const { userId, loginCode } = req.params;
  try {
    if (!loginCode) {
      return next(createHttpError(400, "Params is missing"));
    }
    const verifyLoginToken = await LoginCode.findOne({
      userId: userId,
      code: loginCode,
    });
    if (!verifyLoginToken) {
      return next(createHttpError(404, "Login token not found"));
    }
    if (verifyLoginToken.code !== loginCode) {
      return next(createHttpError(401, "Expired or Invalid login code"));
    }
    const user = await User.findById(userId);
    const accessToken = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    user.refreshToken = refreshToken;
    await user.save();
    return res
      .status(200)
      .json({ accessToken, msg: `Welcome ${user.username}` });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return next(createHttpError(400, "Username or password is missing"));
    }
    const user = await User.findOne({ username }).select("+password");
    if (!user) {
      return next(createHttpError(404, "user account not found"));
    }
    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      return next(createHttpError(401, "username or password is incorrect"));
    }
    const accessToken = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    user.refreshToken = refreshToken;
    await user.save();
    return res
      .status(200)
      .json({ accessToken, msg: `Welcome ${user.username}` });
  } catch (error) {
    next(error);
  }
};

export const authenticateUser = async (req, res, next) => {
  const { id: userId } = req.user;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const getUserRefreshToken = async (req, res, next) => {
  const { id: userId } = req.params;
  try {
    const user = await User.findById(userId).select("+refreshToken");
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    res.status(200).json({ refreshToken: user.refreshToken });
  } catch (error) {
    next(error);
  }
};

export const refereshAccessToken = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(createHttpError(401, "You are unauthenticated!"));
  }
  try {
    jwt.verify(refreshToken, env.JWT_REFRESH_TOKEN, (err, user) => {
      if (err) {
        console.log(err);
        return next(createHttpError(401, "Invalid refresh token"));
      }
      const newAccessToken = generateToken(user.id, user.role);
      const newRefreshToken = generateRefreshToken(user.id, user.role);
      res
        .status(200)
        .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserAccount = async (req, res, next) => {
  const { id: userId } = req.user;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found!"));
    }
    await Merchant.deleteOne({ userId: userId });
    await user.deleteOne();
    res.status(200).json({ msg: "User account deleted" });
  } catch (error) {
    next(error);
  }
};

export const forgotUserPassword = async (req, res, next) => {
  const { email } = req.body;
  const requestOrigin = req.get("Origin");
  if (!email) {
    return next(createHttpError(400, "Email field is missing"));
  }
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return next(createHttpError(404, "Email not found"));
    }
    let setToken = await createRandomToken({
      userId: user.id,
      token: crypto.randomBytes(32).toString("hex"),
    });
    if (!setToken) {
      return next(createHttpError(500, "Error creating token"));
    }
    const passwordResetLink = `${
      requestOrigin === env.BASE_URL_SELLER
        ? env.BASE_URL_SELLER
        : env.BASE_URL_CLIENT
    }/authorize/reset-password/${setToken.userId}/${setToken.token}`;

    const sendPasswordResetMail = await sendEmail({
      username: user.username,
      from: env.BREVO_MAIL_LOGIN,
      to: user.email,
      subject: "Password recovery link",
      text: `You requested to reset your password. Click the link to reset your password ${passwordResetLink}. Link expires in 15minutes. If this was not from you, kindly ignore.`,
      btnText: "Reset password",
      link: passwordResetLink,
    });
    if (!sendPasswordResetMail.success) {
      return next(createHttpError(500, "Password recovery mail not sent"));
    } else {
      res
        .status(200)
        .json({ msg: "Recovery password link sent to your email" });
    }
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req, res, next) => {
  const { userId, token } = req.params;
  const { password } = req.body;
  try {
    if (!isValidObjectId(userId)) {
      return next(createHttpError(400, "Invalid userId"));
    }
    if (!password || !token || !userId) {
      return next(
        createHttpError(401, "Either password, token or userId is missing")
      );
    }
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    const verifyToken = await Token.findOne({
      userId: userId,
      token: token,
    });
    if (!verifyToken) {
      return next(createHttpError(401, "Invalid or expired token"));
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.updateOne({ _id: user.id }, { password: hashedPassword });
    const sendPasswordUpdateMail = await sendEmail({
      username: user.username,
      from: env.BREVO_MAIL_LOGIN,
      to: user.email,
      subject: "Password update",
      text: "You have successfully changed your password",
    });
    res.status(200).json({ sendPasswordUpdateMail, msg: "Password updated!" });
  } catch (error) {
    next(error);
  }
};

export const updateUserAccount = async (req, res, next) => {
  const { id: userId } = req.user;
  const { username, email, currentPassword, password, photo } = req.body;
  try {
    if (!isValidObjectId(userId)) {
      return next(createHttpError(400, "Invalid userid"));
    }
    let profilePhoto;
    let updatedPassword;
    //upload photo to cloudinary
    if (photo) {
      try {
        const photoUploaded = await uploadSingleImage(photo);
        profilePhoto = photoUploaded;
      } catch (error) {
        console.log(error);
        return next(createHttpError(500, "failed to upload image"));
      }
    }
    //handle password
    if (password && !currentPassword) {
      return next(createHttpError(401, "Please provide your current password"));
    }
    if (currentPassword && password) {
      const validatePassword = await User.findById(userId).select("+password");
      const passwordMatched = await bcrypt.compare(
        currentPassword,
        validatePassword.password
      );
      if (!passwordMatched) {
        return next(createHttpError(401, "Current password is incorrect"));
      }
      if (passwordMatched) {
        updatedPassword = await bcrypt.hash(password, 10);
      }
    }
    const updatedFields = {
      username,
      email,
      password: updatedPassword,
      photo: profilePhoto,
    };
    //skip empty fields
    Object.keys(updatedFields).forEach(
      (key) =>
        updatedFields[key] === "" || (undefined && delete updatedFields[key])
    );
    //update user to db
    const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, {
      new: true,
    });
    if (!updatedUser._id.equals(userId)) {
      return next(createHttpError(401, "You can only update your account"));
    }
    res
      .status(200)
      .json({ updatedUser, msg: "User details updated successfully" });
  } catch (error) {
    next(error);
  }
};

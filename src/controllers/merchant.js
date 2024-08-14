import createHttpError from "http-errors";
import Merchant from "../models/merchant.js";
import User from "../models/user.js";
import { uploadSingleImage } from "../config/cloudinaryUpload.js";
import generateRandomNumber from "../utils/generateMerchantCode.js";
import { isValidObjectId } from "mongoose";
import sendEmail from "../config/sendMail.js";
import env from "../utils/validateEnv.js";
import Order from "../models/order.js";
import Customer from "../models/customer.js";

export const createMerchant = async (req, res, next) => {
  const { merchantName, merchantEmail, currency } = req.body;
  const { id: userId } = req.user;
  try {
    if (!merchantName || !merchantEmail || !currency) {
      return next(createHttpError(400, "Field params missing!"));
    }
    const user = await User.findById(userId);
    if (!user) {
      return next(
        createHttpError(
          404,
          "You need to be logged in before creating merchant"
        )
      );
    }
    const existingMerchantName = await Merchant.findOne({ merchantName });
    if (existingMerchantName) {
      return next(
        createHttpError(409, "Merchant name already exists!, choose another")
      );
    }
    //check existing email
    const existingMerchantEmail = await Merchant.findOne({ merchantEmail });
    if (existingMerchantEmail) {
      return next(
        createHttpError(409, "Merchant Email already exists!, choose another")
      );
    }
    //create merchant
    const newMerchant = await Merchant.create({
      merchantName,
      merchantEmail,
      currency,
      userId: user.id,
      merchantCode: generateRandomNumber(),
    });
    if (user.role === "user") {
      user.role = "seller";
      await user.save();
    }
    await newMerchant.save();
    const sendMerchantMail = await sendEmail({
      username: user.username,
      from: env.BREVO_MAIL_LOGIN,
      to: user.email,
      subject: "Start selling",
      text: `Your merchant store ${merchantName} was created. Your merchant code is ${newMerchant.merchantCode}.`,
    });
    return res.status(201).json({
      sendMerchantMail,
      merchant: newMerchant,
      msg: "Your Merchant store was created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMerchant = async (req, res, next) => {
  const { id: userId } = req.user;
  try {
    const merchant = await Merchant.findOne({ userId });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    res.status(200).json(merchant);
  } catch (error) {
    next(error);
  }
};

export const updateMerchantAccount = async (req, res, next) => {
  const { id: merchantId } = req.params;
  const {
    merchantName,
    merchantEmail,
    currency,
    description,
    street,
    city,
    zip,
    state,
    phone,
    country,
    logo,
    coverImage,
  } = req.body;
  try {
    if (!isValidObjectId(merchantId)) {
      return next(createHttpError(400, "Invalid merchantId"));
    }
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    if (!merchant._id.equals(merchantId)) {
      return next(
        createHttpError(
          403,
          "Unauthorized, you can only access your merchant account"
        )
      );
    }
    let logoPhoto;
    let coverPhoto;
    if (logo) {
      try {
        const photoUploaded = await uploadSingleImage(logo);
        logoPhoto = photoUploaded;
      } catch (error) {
        console.log(error);
        return next(createHttpError(500, "failed to upload logo image"));
      }
    }
    if (coverImage) {
      try {
        const photoUploaded = await uploadSingleImage(coverImage);
        coverPhoto = photoUploaded;
      } catch (error) {
        console.log(error);
        return next(createHttpError(500, "failed to upload cover image"));
      }
    }
    const updatedFields = {
      merchantName,
      merchantEmail,
      currency,
      description,
      address: {
        street,
        city,
        zip,
        phone,
        state,
        country,
      },
      logo: logoPhoto,
      coverImage: coverPhoto,
    };
    Object.keys(updatedFields).forEach(
      (key) =>
        updatedFields[key] === "" || (undefined && delete updatedFields[key])
    );
    const updatedMerchant = await Merchant.findByIdAndUpdate(
      merchantId,
      updatedFields,
      {
        new: true,
      }
    );
    res.status(200).json({ updatedMerchant, msg: "Merchant details updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteMerchantAccount = async (req, res, next) => {
  const { id: userId } = req.user;
  try {
    const merchant = await Merchant.findOne({ userId: userId.toString() });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const user = await User.findById(userId);
    await Merchant.deleteOne({ userId: userId });
    user.merchantId = undefined;
    await user.save();
    res.status(200).json({ msg: "Merchant account deleted" });
  } catch (error) {
    next(error);
  }
};

export const seeOrderRecords = async (req, res, next) => {
  const { merchantCode } = req.params;
  const { id: userId } = req.user;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }
    if (!merchantCode) {
      return next(createHttpError(400, "Merchant code is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const orderCount = await Order.countDocuments({
      merchantCode: merchantCode,
    });
    const customerCount = await Customer.countDocuments({
      merchantCode: merchantCode,
    });
    const trackOrderSales = await Order.find({ merchantCode: merchantCode });
    const findIsPaid = await Order.find({
      merchantCode: merchantCode,
      isPaid: true,
    });
    const findNotIsPaid = await Order.find({
      merchantCode: merchantCode,
      isPaid: false,
    });
    const totalSales = trackOrderSales.reduce(
      (acc, curr) => acc + curr.total,
      0
    );
    const findTotalPaid = findIsPaid.reduce((acc, curr) => acc + curr.total, 0);
    const findTotalNotPaid = findNotIsPaid.reduce(
      (acc, curr) => acc + curr.total,
      0
    );
    res.status(200).json({
      orderCount,
      customerCount,
      totalSales,
      findTotalPaid,
      findTotalNotPaid,
    });
  } catch (error) {
    next(error);
  }
};



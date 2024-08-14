import createHttpError from "http-errors";
import { isValidObjectId } from "mongoose";
import Discount from "../models/discount.js";
import Merchant from "../models/merchant.js";

export const createDiscount = async (req, res, next) => {
  const { merchantCode } = req.params;
  const {
    discountCode,
    discountValue,
    quantity,
    startDate,
    endDate,
    products,
    enabled,
  } = req.body;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "Your Merchant code is missing"));
    }
    if (!discountCode || !discountValue) {
      return next(createHttpError(400, "Required parameters are missing!"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant code not found!"));
    }
    const discount = await Discount.create({
      merchantId: merchant._id,
      merchantCode: merchant.merchantCode,
      discountCode,
      discountValue,
      quantity,
      startDate,
      endDate,
      products,
      enabled,
    });
    await discount.save();
    res.status(201).json({ discount, msg: "Discount created" });
  } catch (error) {
    next(error);
  }
};

export const getAllDiscounts = async (req, res, next) => {
  const { merchantCode } = req.params;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "merchantCode is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const discounts = await Discount.find({
      merchantCode: merchantCode,
    }).sort({
      _id: -1,
    });
    res.status(200).json(discounts);
  } catch (error) {
    next(error);
  }
};

export const getADiscount = async (req, res, next) => {
  const { discountId, merchantCode } = req.params;
  try {
    if (!isValidObjectId(discountId)) {
      return next(createHttpError(400, "Invalid discountId "));
    }
    if (!merchantCode || !discountId) {
      return next(
        createHttpError(400, "Merchant code or discountId is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const discount = await Discount.findById(discountId);
    if (!discount) {
      return next(createHttpError(404, "Discount not found"));
    }
    res.status(200).json(discount);
  } catch (error) {
    next(error);
  }
};

export const updateDiscount = async (req, res, next) => {
  const { discountId, merchantCode } = req.params;
  const {
    discountCode,
    discountValue,
    quantity,
    startDate,
    endDate,
    products,
    enabled,
  } = req.body;
  try {
    if (!isValidObjectId(discountId)) {
      return next(createHttpError(400, "Invalid discountId"));
    }
    if (!discountId || !merchantCode) {
      return next(
        createHttpError(400, "DiscountId or merchant code is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    if (merchant.merchantCode !== merchantCode) {
      return next(
        createHttpError(
          403,
          "Unauthorized, You cannot access this merchant discount"
        )
      );
    }
    const updatedFields = {
      discountCode,
      discountValue,
      quantity,
      startDate,
      endDate,
      products,
      enabled,
    };

    Object.keys(updatedFields).forEach(
      (key) =>
        (updatedFields[key] === "" || undefined) && delete updatedFields[key]
    );
    const updatedDiscount = await Discount.findByIdAndUpdate(
      discountId,
      updatedFields,
      {
        new: true,
      }
    );
    res.status(200).json({
      updatedDiscount,
      msg: "Discount updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDiscount = async (req, res, next) => {
  const { discountId, merchantCode } = req.params;
  try {
    if (!isValidObjectId(discountId)) {
      return next(createHttpError(400, "Invalid discountId "));
    }
    if (!discountId || !merchantCode) {
      return next(createHttpError(400, "Params is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const discount = await Discount.findById(discountId);
    if (!discount) {
      return next(createHttpError(404, "discount not found"));
    }
    if (discount.merchantCode !== merchantCode) {
      return next(createHttpError(401, "You can only delete your discounts"));
    }
    await discount.deleteOne();
    res.status(200).json({ msg: "Discount deleted!" });
  } catch (error) {
    next(error);
  }
};

//client
export const validateDiscountCode = async (req, res, next) => {
  const { discountCode } = req.body;
  const { quantity, subTotal } = req.params;
  try {
    const findDiscount = await Discount.findOne({
      discountCode: discountCode,
      enabled: true,
    });
    if (!findDiscount) {
      return next(createHttpError(400, "discount code not valid!"));
    }
    const checkValidity = findDiscount.endDate;
    if (checkValidity !== null) {
      const currentDate = Date.now();
      if (currentDate > checkValidity) {
        return next(createHttpError(400, "Discount code expired!"));
      }
    }
    if (
      quantity &&
      findDiscount.quantity !== 0 &&
      quantity < findDiscount.quantity
    ) {
      return next(
        createHttpError(
          400,
          `Discount code valid for ${findDiscount.quantity} items! Buy more.`
        )
      );
    }
    if (quantity >= findDiscount.quantity) {
      const getDiscount = findDiscount.discountValue / 100;
      const discountValue = getDiscount
        ? (getDiscount * subTotal).toFixed(2)
        : 0;
      res
        .status(200)
        .json({ discountCode, discountValue, msg: "Discount added" });
    }
  } catch (error) {
    next(error);
  }
};

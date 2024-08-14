import createHttpError from "http-errors";
import Merchant from "../models/merchant.js";
import Shipping from "../models/shipping.js";

export const createShippingFee = async (req, res, next) => {
  const { merchantCode } = req.params;
  const { state, country, amount } = req.body;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "Merchant Code is missing"));
    }
    if (!country || !state || !amount) {
      return next(createHttpError(400, "Field params are missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const stateExist = await Shipping.findOne({ state: state });
    if (stateExist) {
      return next(createHttpError(404, "State already added, choose another"));
    }
    const shippingFee = await Shipping.create({
      merchantId: merchant._id,
      merchantCode: merchant.merchantCode,
      state,
      country,
      amount,
    });
    await shippingFee.save();
    res.status(201).json({ shippingFee, msg: "Shipping fee created" });
  } catch (error) {
    next(error);
  }
};

export const getAllShippingFee = async (req, res, next) => {
  const { merchantCode } = req.params;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "Merchant code is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const shipping = await Shipping.find({ merchantCode: merchantCode }).sort({
      _id: -1,
    });
    res.status(200).json(shipping);
  } catch (error) {
    next(error);
  }
};

export const getASingleShippingFee = async (req, res, next) => {
  const { shippingId, merchantCode } = req.params;
  try {
    if (!shippingId || !merchantCode) {
      return next(
        createHttpError(400, "ShippingId or Merchant code is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const shipping = await Shipping.findById(shippingId);
    res.status(200).json(shipping);
  } catch (error) {
    next(error);
  }
};

export const updateShippingFee = async (req, res, next) => {
  const { shippingId, merchantCode } = req.params;
  const { state, country, amount } = req.body;
  try {
    if (!shippingId || !merchantCode) {
      return next(
        createHttpError(400, "ShippingId or Merchant code is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const updatedFields = {
      state,
      country,
      amount,
    };
    Object.keys(updatedFields).forEach(
      (key) =>
        (updatedFields[key] === "" || undefined) && delete updatedFields[key]
    );
    const updatedShipping = await Shipping.findByIdAndUpdate(
      shippingId,
      updatedFields,
      {
        new: true,
      }
    );
    res.status(200).json({
      updatedShipping,
      msg: "Shipping fee updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteShippingFee = async (req, res, next) => {
  const { shippingId, merchantCode } = req.params;
  try {
    if (!shippingId || !merchantCode) {
      return next(
        createHttpError(400, "ShippingId or Merchant code is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const shipping = await Shipping.findById(shippingId);
    if (!shipping) {
      return next(createHttpError(404, "Shipping data not found"));
    }
    if (shipping.merchantCode !== merchantCode) {
      return next(
        createHttpError(401, "You can only delete your own shipping data")
      );
    }
    await shipping.deleteOne();
    res.status(200).json({ msg: "Shipping fee deleted!" });
  } catch (error) {
    next(error);
  }
};

//client
export const getShippingAmount = async (req, res, next) => {
  const { merchantCode, state } = req.params;
  try {
    if (!state || !merchantCode) {
      return next(
        createHttpError(400, "Shipping state or merchant code is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const shippingState = await Shipping.findOne({ state: state });
    const shippingFee = shippingState ? shippingState.amount : 0;
    res.status(200).json(shippingFee);
  } catch (error) {
    next(error);
  }
};

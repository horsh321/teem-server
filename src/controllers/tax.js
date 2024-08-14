import createHttpError from "http-errors";
import Merchant from "../models/merchant.js";
import Tax from "../models/tax.js";

export const createTax = async (req, res, next) => {
  const { merchantCode } = req.params;
  const { street, city, zip, state, country, standardRate, enabled, phone } =
    req.body;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "Merchant Code is missing"));
    }
    if (!country || !standardRate) {
      return next(
        createHttpError(400, "Country or Standard Rate field is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const stateExist = await Tax.findOne({ "address.state": state });
    if (stateExist) {
      return next(createHttpError(404, "State already added, choose another"));
    }
    const tax = await Tax.create({
      merchantId: merchant._id,
      merchantCode: merchant.merchantCode,
      address: {
        street,
        city,
        zip,
        phone,
        state,
        country,
      },
      standardRate,
      enabled,
    });
    await tax.save();
    res.status(201).json({ tax, msg: "Tax rate set success" });
  } catch (error) {
    next(error);
  }
};

export const getAllTax = async (req, res, next) => {
  const { merchantCode } = req.params;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "Merchant code is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const tax = await Tax.find({ merchantCode: merchantCode }).sort({
      _id: -1,
    });
    res.status(200).json(tax);
  } catch (error) {
    next(error);
  }
};

export const getASingleTax = async (req, res, next) => {
  const { taxId, merchantCode } = req.params;
  try {
    if (!taxId || !merchantCode) {
      return next(createHttpError(400, "TaxId or Mercnaht code is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const tax = await Tax.findById(taxId);
    res.status(200).json(tax);
  } catch (error) {
    next(error);
  }
};

export const updateTax = async (req, res, next) => {
  const { taxId, merchantCode } = req.params;
  const { street, city, zip, phone, state, country, standardRate, enabled } =
    req.body;
  try {
    if (!taxId || !merchantCode) {
      return next(createHttpError(400, "TaxId or Mercnaht code is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const updatedFields = {
      address: {
        street,
        zip,
        city,
        phone,
        state,
        country,
      },
      standardRate,
      enabled,
    };
    Object.keys(updatedFields).forEach(
      (key) =>
        updatedFields[key] === "" || (undefined && delete updatedFields[key])
    );
    const updatedTax = await Tax.findByIdAndUpdate(taxId, updatedFields, {
      new: true,
    });
    res.status(200).json({ updatedTax, msg: "Tax details updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteTax = async (req, res, next) => {
  const { taxId, merchantCode } = req.params;
  try {
    if (!taxId || !merchantCode) {
      return next(createHttpError(400, "TaxId or Merchant code is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const tax = await Tax.findById(taxId);
    if (!tax) {
      return next(createHttpError(404, "tax not found"));
    }
    if (tax.merchantCode !== merchantCode) {
      return next(createHttpError(401, "You can only delete your own tax"));
    }
    await tax.deleteOne();
    res.status(200).json({ msg: "Tax deleted!" });
  } catch (error) {
    next(error);
  }
};

//client
export const getTaxRate = async (req, res, next) => {
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
    const findTaxRate = await Tax.findOne({
      "address.state": state,
      enabled: true,
    });
    const taxRate = findTaxRate ? findTaxRate.standardRate : 0;
    res.status(200).json(taxRate);
  } catch (error) {
    next(error);
  }
};

import createHttpError from "http-errors";
import Merchant from "../models/merchant.js";
import Customer from "../models/customer.js";
import Order from "../models/order.js";

export const getAllCustomers = async (req, res, next) => {
  const { merchantCode } = req.params;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "Merchant code is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipCount = (page - 1) * limit;
    const count = await Customer.countDocuments({ merchantCode });
    const totalPages = Math.ceil(count / limit);
    const customers = await Customer.find({
      merchantCode: merchantCode,
    })
      .sort({ _id: -1 })
      .skip(skipCount)
      .limit(limit);
    const customer = {
      currentPage: page,
      totalPages,
      count,
      customers,
    };
    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
};

export const getACustomer = async (req, res, next) => {
  const { merchantCode, username } = req.params;
  try {
    if (!merchantCode || !username) {
      return next(createHttpError(400, "Merchant code or username is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const customer = await Customer.findOne({ username: username });
    if (!customer) {
      return next(createHttpError(404, "Customer not found"));
    }
    const customerOrders = await Order.find({
      userId: customer.userId,
      merchantCode: merchantCode,
    }).sort({ _id: -1 });
    res.status(200).json({ customer, customerOrders });
  } catch (error) {
    next(error);
  }
};

export const deleteACustomer = async (req, res, next) => {
  const { merchantCode, username } = req.params;
  try {
    if (!merchantCode || !username) {
      return next(createHttpError(400, "Merchant code or username is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const customer = await Customer.findOne({ username: username });
    if (!customer) {
      return next(createHttpError(404, "Customer not found"));
    }
    // await Order.deleteOne({ userId: customer.userId });
    await customer.deleteOne();
    res.status(200).json({ msg: "Customer deleted" });
  } catch (error) {
    next(error);
  }
};

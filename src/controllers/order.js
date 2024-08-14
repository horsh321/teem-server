import createHttpError from "http-errors";
import Merchant from "../models/merchant.js";
import Order from "../models/order.js";
import Tax from "../models/tax.js";
import Discount from "../models/discount.js";
import Shipping from "../models/shipping.js";
import User from "../models/user.js";
import Customer from "../models/customer.js";
import env from "../utils/validateEnv.js";
import sendEmail from "../config/sendMail.js";

//check discount
const validateDiscountCode = async (discountCode, quantity, subTotal, next) => {
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
      return discountValue;
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

//calc tax fee
const calculateTax = async (shippingDetails, subTotal, next) => {
  try {
    const getState = shippingDetails.state;
    const findTaxRate = await Tax.findOne({
      "address.state": getState,
      enabled: true,
    });
    const taxRate = findTaxRate ? findTaxRate.standardRate : 0;
    const tax = taxRate / 100;
    const actual = (tax * subTotal).toFixed(2);
    return actual;
  } catch (error) {
    console.error(error);
    next(error);
  }
};

//calc shipping fee
const calcShippingFee = async (shippingDetails, next) => {
  const getState = shippingDetails.state;
  try {
    const findShipping = await Shipping.findOne({ state: getState });
    const shippingFee = findShipping ? findShipping.amount : 2000;
    return shippingFee.toFixed(2);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

//grab and save customer detail at point of order
const addCustomer = async (user, merchant, next) => {
  try {
    const getOrderCount = await Order.find({ userId: user._id });
    const getOrderLength = getOrderCount.length;
    const findUser = await Order.find({ userId: user._id });
    const totalSum = findUser.reduce((acc, curr) => acc + curr.total, 0);
    const findCustomer = await Customer.findOne({ email: user.email });
    if (!findCustomer) {
      const customer = await Customer.create({
        userId: user._id,
        merchantId: merchant._id,
        merchantCode: merchant.merchantCode,
        username: user.username,
        email: user.email,
        photo:
          user.photo ||
          "https://res.cloudinary.com/ceenobi/image/upload/v1698666381/icons/user-avatar-profile-icon-black-vector-illustration_mpn3ef.jpg",
        totalOrders: getOrderLength,
        totalSpent: totalSum,
      });
      await customer.save();
    }
    if (findCustomer) {
      const updatedFields = {
        totalOrders: getOrderLength,
        totalSpent: totalSum,
      };
      const updateCustomer = await Customer.findOneAndUpdate(
        { email: user.email },
        updatedFields,
        {
          new: true,
        }
      );
      await updateCustomer.save();
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const sendOrderMail = async (user, order) => {
  const emailStatus = await sendEmail({
    username: user.username,
    from: env.BREVO_MAIL_LOGIN,
    to: user.email,
    subject: "You created an order",
    text: `Your order ${order._id} was successfully
        created. You are to pay #${order.total}`,
  });
  if (!emailStatus.success) {
    return { error: "Order message not sent" };
  }
};

//create order
export const createOrder = async (req, res, next) => {
  const { id: userId } = req.user;
  const { merchantCode } = req.params;
  const {
    orderItems,
    quantity,
    shippingDetails,
    paymentMethod,
    discountCode,
    subTotal,
  } = req.body;
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
      return next(createHttpError(404, "Merchant account not found"));
    }
    if (orderItems && orderItems.length === 0) {
      return next(createHttpError(400, "No order items to process!"));
    }
    //process discount
    let discountValue = 0;
    if (discountCode) {
      discountValue = await validateDiscountCode(
        discountCode,
        quantity,
        subTotal,
        next
      );
    }
    //process tax
    const calcTax = await calculateTax(shippingDetails, subTotal, next);

    //process shippingFee
    const getShippingFee = await calcShippingFee(
      shippingDetails,
      subTotal,
      next
    );

    const fullTotal = Number(
      (
        Number(subTotal) +
        Number(calcTax) +
        Number(getShippingFee) -
        Number(discountValue)
      ).toFixed(2)
    );
    const order = await Order.create({
      userId: userId,
      merchantId: merchant._id,
      merchantCode: merchant.merchantCode,
      orderItems,
      quantity,
      shippingDetails,
      paymentMethod,
      discount: discountValue,
      taxPrice: calcTax,
      shippingFee: getShippingFee,
      subTotal,
      total: fullTotal,
    });
    await order.save();
    await addCustomer(user, merchant, next);
    await sendOrderMail(user, order);
    res.status(201).json({ order, msg: "Order successfully created." });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req, res, next) => {
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
    const count = await Order.countDocuments({ merchantCode });
    const totalPages = Math.ceil(count / limit);
    const orders = await Order.find({
      merchantCode: merchantCode,
    })
      .sort({ _id: -1 })
      .skip(skipCount)
      .limit(limit);
    const order = {
      currentPage: page,
      totalPages,
      count,
      orders,
    };
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export const getAllClientOrders = async (req, res, next) => {
  const { merchantCode, userId } = req.params;
  try {
    if (!merchantCode || !userId) {
      return next(createHttpError(400, "Merchant code or userId is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipCount = (page - 1) * limit;
    const count = await Order.countDocuments({ merchantCode });
    const totalPages = Math.ceil(count / limit);
    const orders = await Order.find({
      merchantCode: merchantCode,
      userId: userId,
    })
      .sort({ _id: -1 })
      .skip(skipCount)
      .limit(limit);
    const order = {
      currentPage: page,
      totalPages,
      count,
      orders,
    };
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export const getAnOrder = async (req, res, next) => {
  const { orderId, merchantCode } = req.params;
  try {
    if (!merchantCode || !orderId) {
      return next(createHttpError(400, "Merchant code or OrderId is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export const updateAnOrderStatus = async (req, res, next) => {
  const { id: userId } = req.user;
  const { orderId, merchantCode } = req.params;
  const { orderStatus, isPaid, isDelivered, reference } = req.body;
  try {
    if (!merchantCode || !orderId) {
      return next(createHttpError(400, "Merchant code or OrderId is missing"));
    }
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(401, "User not found"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }
    if (merchant.merchantCode !== merchantCode) {
      return next(
        createHttpError(403, "You cannot access this merchant order")
      );
    }
    const updatedFields = {
      orderStatus,
      isPaid,
      paidAt: isPaid ? Date.now() : undefined,
      isDelivered,
      deliveredAt: isDelivered ? Date.now() : undefined,
      reference,
    };
    Object.keys(updatedFields).forEach(
      (key) =>
        (updatedFields[key] === "" || undefined || null) &&
        delete updatedFields[key]
    );

    if (isPaid) {
      await sendEmail({
        username: user.username,
        from: env.BREVO_MAIL_LOGIN,
        to: user.email,
        subject: "Payment received",
        text: `We received your payment with reference id: ${
          reference ? reference : orderId
        }.`,
      });
    }
    if (isDelivered) {
      await sendEmail({
        username: user.username,
        from: env.BREVO_MAIL_LOGIN,
        to: user.email,
        subject: "Order fufillment",
        text: `We have successfully delivered your order with reference id: ${
          reference ? reference : orderId
        }.`,
      });
    }
    const updatedOrder = await Order.findByIdAndUpdate(orderId, updatedFields, {
      new: true,
    });
    res
      .status(200)
      .json({ updatedOrder, msg: "Order info updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const createCheckout = async (req, res, next) => {
  const { merchantCode } = req.params;
  const { quantity, shippingDetails, discountCode, subTotal } = req.body;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "Merchant code is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    let discountValue = 0;
    if (discountCode) {
      discountValue = await validateDiscountCode(
        discountCode,
        quantity,
        subTotal,
        next
      );
    }
    const calcTax = await calculateTax(shippingDetails, subTotal, next);
    const getShippingFee = await calcShippingFee(
      shippingDetails,
      subTotal,
      next
    );
    const total = Number(
      (
        Number(subTotal) +
        Number(calcTax) +
        Number(getShippingFee) -
        Number(discountValue)
      ).toFixed(2)
    );
    res.status(200).json({
      discountValue,
      discountCode,
      subTotal,
      calcTax,
      getShippingFee,
      total,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  const { orderId, merchantCode } = req.params;
  const { id: userId } = req.user;
  try {
    if (!orderId || !merchantCode) {
      return next(createHttpError(400, "OrderId or merchantCode is missing"));
    }
    const user = await User.findById(userId);
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return next(createHttpError(404, "Order not found"));
    }

    if (order.userId.toString() !== userId) {
      return next(
        createHttpError(401, "Unauthorized! You can only delete your orders")
      );
    }

    await order.deleteOne();
    res.status(200).json({ msg: "Order canceled!" });
  } catch (error) {
    next(error);
  }
};

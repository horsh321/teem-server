import createHttpError from "http-errors";
import Category from "../models/category.js";
import Merchant from "../models/merchant.js";
import { uploadSingleImage } from "../config/cloudinaryUpload.js";

export const createCategory = async (req, res, next) => {
  const { merchantCode } = req.params;
  const { name, description, image } = req.body;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "MerchantId is missing"));
    }
    if (!name || !description || !image) {
      return next(createHttpError(400, "Name and Description is required!"));
    }
    let catImage;
    if (image) {
      try {
        const photoUploaded = await uploadSingleImage(image);
        catImage = photoUploaded;
      } catch (error) {
        console.log(error);
        return next(createHttpError(500, "Failed to upload category image"));
      }
    }
    const merchant = await Merchant.findOne({ merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant account not found"));
    }
    const category = await Category.create({
      merchantId: merchant._id,
      merchantCode: merchant.merchantCode,
      name,
      description,
      image: catImage,
    });
    await category.save();
    res.status(201).json({ category, msg: "Category added" });
  } catch (error) {
    next(error);
  }
};

export const getAllCategory = async (req, res, next) => {
  const { merchantCode } = req.params;
  try {
    if (!merchantCode) {
      return next(createHttpError(400, "MerchantId is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const categories = await Category.find({ merchantCode: merchantCode });
    if (!categories) {
      return next(createHttpError(400, "No categories to display"));
    }
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

export const getACategory = async (req, res, next) => {
  const { merchantCode, categoryId } = req.params;
  try {
    if (!merchantCode || !categoryId) {
      return next(createHttpError(400, "Merchant code or categoryId is missing"));
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const category = await Category.findById(categoryId);
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  const { merchantCode, categoryId } = req.params;
  const { name, description, image } = req.body;
  try {
    if (!categoryId || !merchantCode) {
      return next(
        createHttpError(400, "categoryId or merchantCode is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    let catImage = "";
    if (image) {
      try {
        const photoUploaded = await uploadSingleImage(image);
        catImage = photoUploaded;
      } catch (error) {
        console.log(error);
        return next(createHttpError(500, "Failed to upload category image"));
      }
    }
    const updatedFields = {
      name,
      description,
      image: catImage,
    };

    Object.keys(updatedFields).forEach(
      (key) =>
        (updatedFields[key] === "" || undefined) && delete updatedFields[key]
    );
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updatedFields,
      {
        new: true,
      }
    );
    res.status(200).json({ updatedCategory, msg: "Category updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  const { merchantCode, categoryId } = req.params;
  try {
    if (!categoryId || !merchantCode) {
      return next(
        createHttpError(400, "categoryId or merchantCode is missing")
      );
    }
    const merchant = await Merchant.findOne({ merchantCode: merchantCode });
    if (!merchant) {
      return next(createHttpError(404, "Merchant not found"));
    }
    const category = await Category.findById(categoryId);
    if (!category) {
      return next(createHttpError(404, "category not found"));
    }
    if (category.merchantCode !== merchantCode) {
      return next(createHttpError(401, "You can only delete your category "));
    }
    await category.deleteOne();
    res.status(200).json({ msg: "Category deleted!" });
  } catch (error) {
    next(error);
  }
};
